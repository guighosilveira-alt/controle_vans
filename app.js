import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
/*
// CONFIGURAÇÃO DO FIREBASE (INSIRA SUAS CREDENCIAIS REAIS)
const firebaseConfig = {
  apiKey: "AIzaSyBAd6FjJyipmiWRnmMUzc353XMyCT9ldc",
  authDomain: "controle-vans-bourbon.firebaseapp.com",
  projectId: "controle-vans-bourbon",
  storageBucket: "controle-vans-bourbon.firebasestorage.app",
  messagingSenderId: "859690609728",
  appId: "1:859690609728:web:a407eae7447b869c7243a5"
};
*/
// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ESTADO DA APLICAÇÃO EM MEMÓRIA
let currentVanId = null;
let currentVanData = {
  driver: '',
  capacity: 16,
  collaborators: []
};

let isAuthenticatedForEdit = false;

// ELEMENTOS DOM
const hamburgerBtn = document.getElementById('hamburger-btn');
const sideMenu = document.getElementById('side-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const overlay = document.getElementById('overlay');
const vanButtons = document.querySelectorAll('.van-btn');
const routeTooltip = document.getElementById('route-tooltip');

const homeView = document.getElementById('home-view');
const vanManagement = document.getElementById('van-management');
const currentVanTitle = document.getElementById('current-van-title');
const driverNameInput = document.getElementById('driver-name');
const maxCapacityInput = document.getElementById('max-capacity');
const capacityBadge = document.getElementById('capacity-badge');

// PROGRESS BAR E COUNTER
const progressBarFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');
const occupantsCounterText = document.getElementById('occupants-counter-text');

const collabSectionCard = document.getElementById('collab-section-card');
const collabForm = document.getElementById('collab-form');
const collabIdInput = document.getElementById('collab-id');
const collabNameInput = document.getElementById('collab-name');
const collabSectorInput = document.getElementById('collab-sector');
const collabList = document.getElementById('collab-list');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveAllBtn = document.getElementById('save-all-btn');
const backHomeBtn = document.getElementById('back-home-btn');
const exitBtn = document.getElementById('exit-btn');

// TEMA ESCURO / CLARO
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');

// MODAIS
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const occupantsModal = document.getElementById('occupants-modal');
const closeModalBtns = document.querySelectorAll('.close-modal-btn');

// ELEMENTOS DO MODAL DE SENHA
const passwordModal = document.getElementById('password-modal');
const authPasswordInput = document.getElementById('auth-password-input');
const togglePassVisibilityBtn = document.getElementById('toggle-pass-visibility');
const eyeIcon = document.getElementById('eye-icon');
const confirmAuthBtn = document.getElementById('confirm-auth-btn');
const cancelAuthBtn = document.getElementById('cancel-auth-btn');
const closePassModalBtn = document.getElementById('close-pass-modal');

let pendingVanId = null;
let pendingVanTitle = null;

// SISTEMA DE TOAST NOTIFICATIONS (SUBSTITUINDO ALERT)
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconHtml = '<i class="fa-solid fa-circle-check" style="color:var(--success);"></i>';
  if (type === 'error') iconHtml = '<i class="fa-solid fa-circle-xmark" style="color:var(--danger);"></i>';
  if (type === 'warning') iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color:var(--warning);"></i>';

  toast.innerHTML = `${iconHtml} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// TOGGLE MODO ESCURO
themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
    localStorage.setItem('theme', 'dark');
  } else {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
    localStorage.setItem('theme', 'light');
  }
});

// CARREGAR TEMA SALVO
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  themeIcon.classList.remove('fa-moon');
  themeIcon.classList.add('fa-sun');
}

// MOSTRAR / OCULTAR SENHA
togglePassVisibilityBtn.addEventListener('click', () => {
  if (authPasswordInput.type === 'password') {
    authPasswordInput.type = 'text';
    eyeIcon.classList.remove('fa-eye');
    eyeIcon.classList.add('fa-eye-slash');
  } else {
    authPasswordInput.type = 'password';
    eyeIcon.classList.remove('fa-eye-slash');
    eyeIcon.classList.add('fa-eye');
  }
});

// CONTROLADORES DO MENU LATERAL
function openMenu() { sideMenu.classList.add('open'); overlay.classList.add('active'); }
function closeMenu() { sideMenu.classList.remove('open'); overlay.classList.remove('active'); }

hamburgerBtn.addEventListener('click', openMenu);
closeMenuBtn.addEventListener('click', closeMenu);
overlay.addEventListener('click', closeMenu);

// BOTÃO SAIR
exitBtn.addEventListener('click', () => {
  if (confirm("Deseja realmente encerrar a aplicação?")) {
    window.close();
    document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#222;color:#fff;font-family:sans-serif;text-align:center;"><h2>Aplicação encerrada. Você pode fechar esta aba.</h2></div>';
  }
});

// BOTÃO VOLTAR PARA HOME
backHomeBtn.addEventListener('click', () => {
  vanManagement.classList.add('hidden');
  homeView.classList.remove('hidden');
  currentVanId = null;
  resetCollabForm();
});

// EVENTOS HOVER (POP-UP DE ROTAS NOS BOTÕES)
vanButtons.forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    const routeText = btn.getAttribute('data-route');
    routeTooltip.innerText = `Rota: ${routeText}`;
    routeTooltip.classList.remove('hidden');
  });

  btn.addEventListener('mousemove', (e) => {
    routeTooltip.style.top = `${e.pageY + 10}px`;
    routeTooltip.style.left = `${e.pageX + 10}px`;
  });

  btn.addEventListener('mouseleave', () => {
    routeTooltip.classList.add('hidden');
  });

  let clickTimer = null;
  btn.addEventListener('click', () => {
    if (clickTimer === null) {
      clickTimer = setTimeout(() => {
        clickTimer = null;
        handleVanAccess(btn.getAttribute('data-id'), btn.innerText);
        closeMenu();
      }, 250);
    }
  });

  btn.addEventListener('dblclick', () => {
    clearTimeout(clickTimer);
    clickTimer = null;
    openOccupantsModal(btn.getAttribute('data-id'), btn.innerText);
    closeMenu();
  });
});

// GERENCIAR SENHA E ACESSO À VAN
function handleVanAccess(vanId, vanTitle) {
  if (isAuthenticatedForEdit) {
    selectVan(vanId, vanTitle);
  } else {
    pendingVanId = vanId;
    pendingVanTitle = vanTitle;
    authPasswordInput.value = '';
    authPasswordInput.type = 'password';
    eyeIcon.className = 'fa-solid fa-eye';
    passwordModal.classList.remove('hidden');
    authPasswordInput.focus();
  }
}

// CONFIRMAR SENHA DIGITADA
confirmAuthBtn.addEventListener('click', () => {
  const password = authPasswordInput.value;
  if (password === "admin123") {
    isAuthenticatedForEdit = true;
    showToast("Acesso autorizado com sucesso!", "success");
    passwordModal.classList.add('hidden');
    selectVan(pendingVanId, pendingVanTitle);
  } else {
    showToast("Senha incorreta!", "error");
    authPasswordInput.value = '';
    authPasswordInput.focus();
  }
});

authPasswordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    confirmAuthBtn.click();
  }
});

const closePasswordModal = () => {
  passwordModal.classList.add('hidden');
  showToast("Abrindo dados apenas para visualização.", "warning");
  isAuthenticatedForEdit = false;
  selectVan(pendingVanId, pendingVanTitle);
};

cancelAuthBtn.addEventListener('click', closePasswordModal);
closePassModalBtn.addEventListener('click', closePasswordModal);

// CARREGAR DADOS DO FIREBASE DA VAN SELECIONADA
async function selectVan(vanId, vanTitle) {
  currentVanId = vanId;
  currentVanTitle.innerText = vanTitle;
  
  driverNameInput.value = '';
  maxCapacityInput.value = 16;
  currentVanData = { driver: '', capacity: 16, collaborators: [] };

  homeView.classList.add('hidden');
  vanManagement.classList.remove('hidden');

  try {
    const vanDoc = await getDoc(doc(db, "vans", vanId));
    if (vanDoc.exists()) {
      currentVanData = vanDoc.data();
    } else {
      currentVanData = { driver: '', capacity: 16, collaborators: [] };
    }
  } catch (error) {
    console.error("Erro ao carregar dados do Firebase, usando local:", error);
  }

  driverNameInput.value = currentVanData.driver || '';
  maxCapacityInput.value = currentVanData.capacity || 16;

  if (isAuthenticatedForEdit) {
    driverNameInput.removeAttribute('disabled');
    maxCapacityInput.removeAttribute('disabled');
    collabSectionCard.style.display = 'block';
    saveAllBtn.style.display = 'block';
  } else {
    driverNameInput.setAttribute('disabled', 'true');
    maxCapacityInput.setAttribute('disabled', 'true');
    collabSectionCard.style.display = 'none';
    saveAllBtn.style.display = 'none';
  }

  renderCollaboratorsTable();
  updateCapacityBadge();
}

// ATUALIZA STATUS DA LOTAÇÃO E BARRA DE PROGRESSO VISUAL
maxCapacityInput.addEventListener('input', updateCapacityBadge);

function updateCapacityBadge() {
  const count = currentVanData.collaborators.length;
  const cap = parseInt(maxCapacityInput.value) || 16;
  const vagas = cap - count;
  const percent = Math.min(Math.round((count / cap) * 100), 100);

  // Atualiza Barra de Progresso
  progressBarFill.style.width = `${percent}%`;
  progressText.innerText = `${count} / ${cap} vagas preenchidas`;

  // Cores dinâmicas da barra de progresso e badge
  if (count >= cap) {
    capacityBadge.innerText = "Lotada";
    capacityBadge.className = "badge badge-full";
    progressBarFill.style.backgroundColor = "var(--danger)";
  } else if (vagas <= 3) {
    capacityBadge.innerText = `${vagas} vaga${vagas > 1 ? 's' : ''}`;
    capacityBadge.className = "badge badge-warning";
    progressBarFill.style.backgroundColor = "var(--warning)";
  } else {
    capacityBadge.innerText = `${vagas} vaga${vagas > 1 ? 's' : ''}`;
    capacityBadge.className = "badge badge-available";
    progressBarFill.style.backgroundColor = "var(--success)";
  }

  occupantsCounterText.innerText = `Ocupantes cadastrados: ${count} de ${cap}`;
}

// RENDERIZAR TABELA DE COLABORADORES
function renderCollaboratorsTable() {
  collabList.innerHTML = '';
  currentVanData.collaborators.forEach((c, index) => {
    const tr = document.createElement('tr');
    
    let actionsHtml = '';
    if (isAuthenticatedForEdit) {
      actionsHtml = `
        <button class="icon-btn edit-collab" style="color:#2980b9;" data-index="${index}" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn delete-collab" style="color:#c0392b;" data-index="${index}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      `;
    } else {
      actionsHtml = `<span style="font-size:0.8rem; color:#888;">Somente leitura</span>`;
    }

    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.sector}</td>
      <td>${actionsHtml}</td>
    `;
    collabList.appendChild(tr);
  });

  if (isAuthenticatedForEdit) {
    document.querySelectorAll('.edit-collab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        const item = currentVanData.collaborators[idx];
        collabIdInput.value = idx;
        collabNameInput.value = item.name;
        collabSectorInput.value = item.sector;
        cancelEditBtn.classList.remove('hidden');
        collabNameInput.focus();
      });
    });

    document.querySelectorAll('.delete-collab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        currentVanData.collaborators.splice(idx, 1);
        renderCollaboratorsTable();
        updateCapacityBadge();
        showToast("Colaborador removido da lista.", "warning");
      });
    });
  }
}

// MANIPULAR FORMULÁRIO DE COLABORADOR
collabForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = collabNameInput.value.trim();
  const sector = collabSectorInput.value.trim();
  const editIndex = collabIdInput.value;
  const cap = parseInt(maxCapacityInput.value) || 16;

  if (editIndex === '' && currentVanData.collaborators.length >= cap) {
    showToast("A capacidade máxima da van foi atingida!", "error");
    return;
  }

  if (editIndex !== '') {
    currentVanData.collaborators[editIndex] = { name, sector };
    showToast("Colaborador atualizado com sucesso!");
  } else {
    currentVanData.collaborators.push({ name, sector });
    showToast("Colaborador adicionado com sucesso!");
  }

  resetCollabForm();
  renderCollaboratorsTable();
  updateCapacityBadge();
});

function resetCollabForm() {
  collabIdInput.value = '';
  collabNameInput.value = '';
  collabSectorInput.value = '';
  cancelEditBtn.classList.add('hidden');
}

cancelEditBtn.addEventListener('click', resetCollabForm);

// SALVAR ALTERAÇÕES GERAIS DA VAN
saveAllBtn.addEventListener('click', async () => {
  if (!currentVanId) return;

  currentVanData.driver = driverNameInput.value.trim();
  currentVanData.capacity = parseInt(maxCapacityInput.value) || 16;

  try {
    const savePromise = setDoc(doc(db, "vans", currentVanId), currentVanData);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
    
    await Promise.race([savePromise, timeoutPromise]);
    showToast("Dados da van salvos com sucesso no Firebase!", "success");
  } catch (error) {
    console.warn("Aviso ao salvar no Firestore (mantido localmente):", error);
    showToast("Dados salvos localmente! (Verifique a conexão)", "warning");
  } finally {
    vanManagement.classList.add('hidden');
    homeView.classList.remove('hidden');
    currentVanId = null;
    resetCollabForm();
  }
});

// MODAL DUPLO CLIQUE (RESUMO DA LOTAÇÃO)
async function openOccupantsModal(vanId, vanTitle) {
  let vanData = { driver: '', capacity: 16, collaborators: [] };

  try {
    const vanDoc = await getDoc(doc(db, "vans", vanId));
    if (vanDoc.exists()) {
      vanData = vanDoc.data();
    }
  } catch (err) {
    if (vanId === currentVanId) vanData = currentVanData;
  }

  document.getElementById('modal-van-title').innerText = vanTitle;
  document.getElementById('modal-driver-name').innerText = vanData.driver || 'Não cadastrado';
  document.getElementById('modal-capacity').innerText = vanData.capacity || 16;
  document.getElementById('modal-count').innerText = vanData.collaborators.length;

  const count = vanData.collaborators.length;
  const cap = vanData.capacity || 16;
  const statusBadge = document.getElementById('modal-status-badge');

  if (count >= cap) {
    statusBadge.innerText = "Lotada";
    statusBadge.className = "badge badge-full";
  } else {
    const vagas = cap - count;
    statusBadge.innerText = `${vagas} vaga${vagas > 1 ? 's' : ''}`;
    statusBadge.className = "badge badge-available";
  }

  const occupantsList = document.getElementById('modal-occupants-list');
  occupantsList.innerHTML = '';

  if (vanData.collaborators.length === 0) {
    occupantsList.innerHTML = '<li>Nenhum colaborador cadastrado nesta van.</li>';
  } else {
    vanData.collaborators.forEach(collab => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${collab.name}</strong> — <span style="color:var(--secondary);">${collab.sector}</span>`;
      occupantsList.appendChild(li);
    });
  }

  occupantsModal.classList.remove('hidden');
}

// FECHAMENTO DOS MODAIS
aboutBtn.addEventListener('click', () => {
  aboutModal.classList.remove('hidden');
  closeMenu();
});

closeModalBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
    occupantsModal.classList.add('hidden');
  });
});

document.getElementById('terms-link').addEventListener('click', (e) => {
  e.preventDefault();
  alert("Termos de Uso: Sistema de uso interno reservado para gestão de transporte e controle de rotas das vans do Bourbon Country.");
});
