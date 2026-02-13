// ===== CONFIGURAÇÃO SUPABASE =====
const SUPABASE_URL = 'https://ibchbcxtzngihxjschgl.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliY2hiY3h0em5naWh4anNjaGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTYyNzYsImV4cCI6MjA4NTI5MjI3Nn0.ybBzyBWFQIvw6EV3F_xQwvXHJBX7wTsm05xEgRqsu34'; 

var supabaseClient = null;
let currentUser = null;
let selectedQuadra = 'Quadra 1';
let selectedDate = new Date();
let selectedTime = null;
let duracaoHoras = 1;
let busySlots = [];

const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// ===== FUNÇÕES UI =====
function selecionarQuadra(nome, el) {
    selectedQuadra = nome;
    $('.chip').removeClass('selected');
    $(el).addClass('selected');
    $('#quadraSelecionadaDisplay').text(nome);
}

function abrirCalendario(titulo) {
    $('#modalTitle').text(titulo);
    $('#calendarModal').addClass('active');
    renderDias();
    renderHorarios();
    buscarAgendamentos(new Date().toISOString().split('T')[0]);
}

function fecharModal(id) { 
    $(`#${id}`).removeClass('active');
    setTimeout(() => {
        if (!$(`#${id}`).hasClass('active')) {
            // Apenas para garantir limpeza
        }
    }, 500);
}

function toggleAuth(v) { 
    if(v === 'login') { 
        $('#loginView').fadeOut(200, function() {
            $(this).removeClass('hidden');
            $('#cadastroView').addClass('hidden');
        }).fadeIn(200);
        $('#cadastroView').fadeOut(200);
    } else if(v === 'cadastro') { 
        $('#cadastroView').fadeOut(200, function() {
            $(this).removeClass('hidden');
            $('#loginView').addClass('hidden');
        }).fadeIn(200);
        $('#loginView').fadeOut(200);
    }
}

function checkAuthAndOpen() {
    console.log('👤 Clique no ícone - usuário logado?', currentUser ? 'SIM' : 'NÃO');
    
    if(currentUser) { 
        // Usuário ESTÁ logado - mostrar opção de sair
        if(confirm("Deseja sair de sua conta?")) { 
            try {
                supabaseClient.auth.signOut();
                currentUser = null;
                localStorage.clear();
                window.location.href = 'index.html';
            } catch(e) {
                console.error('Erro ao sair:', e);
                window.location.reload();
            }
        } 
    } else {
        // Usuário NÃO está logado - abrir modal de login
        console.log('Abrindo modal de login');
        $('#authModal').addClass('active'); 
        toggleAuth('login');
    }
}

// ===== FUNÇÕES RENDER =====
function renderDias() {
    let html = '';
    for(let i=0; i<30; i++) {
        let d = new Date(); 
        d.setDate(new Date().getDate() + i);
        let active = i === 0 ? 'active' : '';
        html += `<div class="day-card ${active}" onclick="selecionarDia(this, ${i})"><span class="day-name">${weekDays[d.getDay()]}</span><span class="day-number">${d.getDate()}</span></div>`;
    }
    $('#daysContainer').html(html);
}

function renderHorarios() {
    let html = '';
    for(let i=0; i<33; i++) { 
        let h = Math.floor(7 + i/2);
        let m = (i % 2) === 0 ? '00' : '30';
        let time = `${h.toString().padStart(2,'0')}:${m}`;
        let isBusy = busySlots.includes(time);
        let statusClass = isBusy ? 'busy' : 'free';
        
        html += `<div class="time-slot ${statusClass}" onclick="tentarAgendar('${time}')">${time}</div>`;
    }
    $('#timeContainer').html(html);
}

function selecionarDia(el, diasExtra) {
    $('.day-card').removeClass('active'); 
    $(el).addClass('active');
    let hoje = new Date();
    selectedDate = new Date(hoje.setDate(hoje.getDate() + diasExtra));
    buscarAgendamentos(selectedDate.toISOString().split('T')[0]);
    renderHorarios();
}

function selecionarHora(el, time) {
    // Não permitir selecionar horários ocupados
    if ($(el).hasClass('busy')) {
        alert('⚠️ Este horário já foi reservado!');
        return;
    }
    
    if (!currentUser) {
        alert('📋 Para agendar este horário, faça login ou cadastre-se!');
        $('#authModal').addClass('active');
        toggleAuth('login');
        return;
    }

    $('.time-slot').removeClass('selected'); 
    $(el).addClass('selected');
    selectedTime = time;
    
    // Atualizar botão com evento de clique
    $('#btnConfirmar')
        .css('background', '#FF4500')
        .css('color', 'black')
        .text(`CONFIRMAR (${time})`)
        .off('click')
        .on('click', function(e) {
            e.preventDefault();
            handleBtnConfirmar();
        });
}

function mudarDuracao(h, el) {
    duracaoHoras = h;
    $('.btn-duracao').removeClass('active'); 
    $(el).addClass('active');
}

function handleBtnConfirmar() {
    console.log('🔍 Botão clicado!');
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
        console.log('❌ Não logado - Fechando calendário e abrindo login');
        fecharModal('calendarModal');
        
        setTimeout(() => {
            $('#authModal').addClass('active');
            $('#loginView').removeClass('hidden').show();
            $('#cadastroView').addClass('hidden').hide();
            $('#loginEmail').focus();
            console.log('✅ Login aberto com transição suave');
        }, 500);
    } else {
        console.log('✅ Logado - Salvando reserva');
        salvarReserva();
    }
}

function tentarAgendar(time) {
    if (!currentUser) {
        if(confirm("🔒 Para agendar, faça login.")) {
            fecharModal('calendarModal');
            setTimeout(() => {
                $('#authModal').addClass('active');
                toggleAuth('login');
            }, 300);
        }
    } else {
        const timestamp = new Date().getTime();
        window.location.href = 'admin.html?nocache=' + timestamp + '&v=' + Math.random();
    }
}

// ===== FUNÇÕES SUPABASE =====
async function inicializarSupabase() {
    try {
        if (!window.supabase) {
            console.error('Supabase não disponível');
            return;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase OK");
        await checkSession();
    } catch(e) { 
        console.error('❌ Erro:', e);
    }
}

async function checkSession() {
    if(!supabaseClient) return;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            document.getElementById('userStatusBtn').innerHTML = '✅';
            document.getElementById('userStatusBtn').style.background = '#39FF14';
            document.getElementById('userStatusBtn').style.color = 'black';
            
            // Atualizar botão para ir para painel
            if ($('#btnConfirmar').length) {
                $('#btnConfirmar')
                    .text("IR PARA PAINEL DE AGENDAMENTO")
                    .css('background', '#FF4500')
                    .css('color', 'black')
                    .off('click')
                    .on('click', function() {
                        window.location.href = 'admin.html?v=' + Date.now();
                    });
            }
        } else {
            currentUser = null;
            document.getElementById('userStatusBtn').innerHTML = '👤';
            document.getElementById('userStatusBtn').style.background = 'rgba(255,255,255,0.1)';
            document.getElementById('userStatusBtn').style.color = 'white';
            
            if ($('#btnConfirmar').length) {
                $('#btnConfirmar')
                    .text("🔒 Faça Login para Agendar")
                    .css('background', '#333')
                    .css('color', '#888')
                    .off('click')
                    .on('click', function() {
                        tentarAgendar();
                    });
            }
        }
    } catch(e) {
        console.error('Erro:', e);
    }
}

async function fazerLogin() {
    const email = $('#loginEmail').val().trim().toLowerCase();
    const password = $('#loginPassword').val().trim();
    
    if (!email || !password) {
        alert('⚠️ Preencha email e senha!');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert("❌ Erro: " + error.message);
        } else {
            currentUser = data.user;
            
            // Salvar dados localmente para dashboard
            localStorage.setItem('userEmail', currentUser.email);
            localStorage.setItem('userId', currentUser.id);
            localStorage.setItem('loginTime', Date.now());
            
            fecharModal('authModal');
            checkSession();
            alert("✅ Login realizado! Redirecionando...");
            
            // Redirecionar para dashboard com cache busting
            setTimeout(() => {
                window.location.href = 'admin.html?v=' + Date.now();
            }, 1000);
        }
    } catch(e) {
        alert('❌ Erro: ' + e.message);
    }
}

async function criarConta() {
    const email = $('#regEmail').val().trim().toLowerCase();
    const password = $('#regPassword').val().trim();
    const nome = $('#regNome').val().trim();
    const whats = $('#regWhats').val().trim();
    
    if (!email || !password || !nome || !whats) {
        alert('⚠️ Preencha todos os campos!');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        alert('⚠️ Email inválido! Use um formato válido (ex: usuario@email.com)');
        return;
    }

    if (password.length < 6) {
        alert('⚠️ Senha deve ter no mínimo 6 caracteres!');
        return;
    }

    if (nome.length < 3) {
        alert('⚠️ Nome deve ter no mínimo 3 caracteres!');
        return;
    }

    if (whats.length < 10) {
        alert('⚠️ WhatsApp inválido! Formato: (XX) 9XXXX-XXXX');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: nome,
                    whatsapp: whats
                }
            }
        });
        
        if (error) {
            if (error.message.includes('rate limit')) {
                alert("⏳ Muitas tentativas! Aguarde 5 minutos antes de tentar novamente.");
            } else if (error.message.includes('already exists')) {
                alert("❌ Este email já está cadastrado! Faça login ou use outro email.");
            } else if (error.message.includes('email')) {
                alert("❌ Erro no email: " + error.message);
            } else {
                alert("❌ Erro: " + error.message);
            }
        } else {
            // Salvar dados localmente para dashboard
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userId', data.user.id);
            
            currentUser = data.user;
            localStorage.setItem('loginTime', Date.now());
            alert("✅ Conta criada com sucesso! Redirecionando para o painel...");
            
            // Redirecionar para dashboard após 1 segundo com cache busting
            setTimeout(() => {
                window.location.href = 'admin.html?v=' + Date.now();
            }, 1000);
        }
    } catch(e) {
        alert('❌ Erro: ' + e.message);
    }
}

async function buscarAgendamentos(dataISO) {
    if(!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('agendamentos')
            .select('hora_inicio')
            .eq('data_jogo', dataISO)
            .eq('sub_recurso', selectedQuadra);

        if(data) {
            busySlots = data.map(d => d.hora_inicio);
            renderHorarios();
        } else {
            busySlots = [];
            renderHorarios();
        }
    } catch(e) {
        console.error('Erro:', e);
    }
}

async function salvarReserva() {
    if (!currentUser) {
        $('#authModal').addClass('active');
        toggleAuth('login');
        return;
    }
    
    if (!selectedTime) {
        alert('Selecione um horário!');
        return;
    }

    const btn = document.getElementById('btnConfirmar');
    btn.innerText = "Salvando...";
    btn.disabled = true;
    
    const dataFormatada = selectedDate.toISOString().split('T')[0];

    try {
        const { error } = await supabaseClient.from('agendamentos').insert({
            user_id: currentUser.id,
            tipo_recurso: 'Arena',
            sub_recurso: selectedQuadra,
            data_jogo: dataFormatada,
            hora_inicio: selectedTime,
            duracao: duracaoHoras,
            status: 'confirmado'
        });

        if (error) {
            alert("❌ Erro: " + error.message);
        } else {
            alert("✅ Agendamento confirmado!");
            fecharModal('calendarModal');
            buscarAgendamentos(dataFormatada);
        }
        btn.innerText = "CONFIRMAR";
        btn.disabled = true;
    } catch(e) {
        alert('❌ Erro: ' + e.message);
        btn.innerText = "Tentar Novamente";
        btn.disabled = false;
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
    renderDias();
    inicializarSupabase();
    
    // Adicionar evento ao botão na inicialização
    $('#btnConfirmar').on('click', function(e) {
        e.preventDefault();
        handleBtnConfirmar();
    });
});
