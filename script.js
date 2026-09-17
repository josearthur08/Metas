const form = document.querySelector('#goal-form');
const titleInput = document.querySelector('#goal-title');
const targetInput = document.querySelector('#goal-target');
const currentInput = document.querySelector('#goal-current');
const progressArea = document.querySelector('#progress-area');
const goalName = document.querySelector('#goal-name');
const percentage = document.querySelector('#percentage');
const progressFill = document.querySelector('#progress-fill');
const progressTrack = document.querySelector('.progress-track');
const currentDisplay = document.querySelector('#current-display');
const remainingDisplay = document.querySelector('#remaining-display');
const saveLabel = document.querySelector('#save-label');
const toast = document.querySelector('#toast');
const goalsList = document.querySelector('#goals-list');
const publicGoals = document.querySelector('#public-goals');

const storageKey = 'financial-goals';
const legacyStorageKey = 'financial-goal';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let selectedGoalId = null;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readGoals() {
  try {
    const savedGoals = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (Array.isArray(savedGoals)) return savedGoals;
    const legacyGoal = JSON.parse(localStorage.getItem(legacyStorageKey) || 'null');
    if (legacyGoal) {
      const migratedGoal = { ...legacyGoal, id: createId() };
      localStorage.setItem(storageKey, JSON.stringify([migratedGoal]));
      return [migratedGoal];
    }
  } catch {
    return [];
  }
  return [];
}

function saveGoals(goals) {
  localStorage.setItem(storageKey, JSON.stringify(goals));
  localStorage.setItem(legacyStorageKey, JSON.stringify(goals[0] || null));
}

function getNumber(input) {
  return Math.max(0, Number.parseFloat(input.value) || 0);
}

function getProgress(goal) {
  const target = Math.max(0, Number(goal.target) || 0);
  const current = Math.max(0, Number(goal.current) || 0);
  const percent = target > 0 ? Math.round(Math.min(current / target, 1) * 100) : 0;
  return { target, current, percent, remaining: Math.max(target - current, 0) };
}

function renderGoal(goal) {
  if (!goal || !progressArea) return;
  const progress = getProgress(goal);
  goalName.textContent = goal.title || 'Sua próxima conquista';
  percentage.textContent = `${progress.percent}%`;
  currentDisplay.textContent = currency.format(progress.current);
  remainingDisplay.textContent = currency.format(progress.remaining);
  progressFill.style.width = `${progress.percent}%`;
  progressTrack.setAttribute('aria-valuenow', progress.percent);
  progressArea.style.display = 'block';
  if (saveLabel) saveLabel.textContent = 'Atualizar progresso';
}

function fillForm(goal) {
  titleInput.value = goal?.title || '';
  targetInput.value = goal?.target || '';
  currentInput.value = goal?.current || '';
  if (goal) renderGoal(goal);
}

function renderEditorList(goals) {
  if (!goalsList) return;
  goalsList.replaceChildren();
  goals.forEach((goal) => {
    const progress = getProgress(goal);
    const item = document.createElement('div');
    item.className = `goal-item${goal.id === selectedGoalId ? ' active' : ''}`;
    item.dataset.goalId = goal.id;

    const selectButton = document.createElement('button');
    selectButton.className = 'goal-select';
    selectButton.type = 'button';
    selectButton.innerHTML = `<span class="goal-item-title"></span><span class="goal-item-progress">${progress.percent}%</span>`;
    selectButton.querySelector('.goal-item-title').textContent = goal.title || 'Meta sem título';
    selectButton.addEventListener('click', () => {
      selectedGoalId = goal.id;
      fillForm(goal);
      renderEditorList(readGoals());
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'goal-delete';
    deleteButton.type = 'button';
    deleteButton.title = 'Excluir meta';
    deleteButton.setAttribute('aria-label', `Excluir ${goal.title || 'meta'}`);
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', () => {
      const remainingGoals = readGoals().filter((savedGoal) => savedGoal.id !== goal.id);
      saveGoals(remainingGoals);
      selectedGoalId = remainingGoals[0]?.id || null;
      fillForm(remainingGoals[0] || null);
      if (!remainingGoals.length) {
        progressArea.style.display = 'none';
        saveLabel.textContent = 'Criar minha meta';
      }
      renderEditorList(remainingGoals);
      showToast('Meta excluída.');
    });

    item.append(selectButton, deleteButton);
    goalsList.append(item);
  });
}

function encodeGoals(goals) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(goals))));
}

function decodeGoals(value) {
  try {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(value))));
    return Array.isArray(decoded) ? decoded : [decoded];
  } catch {
    return [];
  }
}

function getPublicUrl(goals) {
  const publicUrl = new URL('index.html', window.location.href);
  publicUrl.hash = `goals=${encodeGoals(goals)}`;
  return publicUrl.href;
}

function renderPublicGoals(goals) {
  if (!publicGoals) return;
  publicGoals.replaceChildren();
  if (!goals.length) {
    const empty = document.createElement('p');
    empty.className = 'public-empty';
    empty.textContent = 'Nenhuma meta compartilhada.';
    publicGoals.append(empty);
    return;
  }

  goals.forEach((goal) => {
    const progress = getProgress(goal);
    const card = document.createElement('article');
    card.className = 'public-goal-card';
    card.innerHTML = `
      <div class="public-goal-heading">
        <div><p class="eyebrow">META FINANCEIRA</p><h2 class="public-goal-name"></h2></div>
        <div class="percentage-wrap"><strong>${progress.percent}%</strong><span>concluído</span></div>
      </div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}" aria-label="Progresso da meta"><div class="progress-fill" style="width: ${progress.percent}%"></div></div>
      <div class="progress-footer"><span><strong>${currency.format(progress.current)}</strong> guardados</span><span>faltam <strong>${currency.format(progress.remaining)}</strong></span></div>`;
    card.querySelector('.public-goal-name').textContent = goal.title || 'Sua próxima conquista';
    publicGoals.append(card);
  });
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function persistSelectedGoal() {
  if (!selectedGoalId) return;
  const title = titleInput.value.trim();
  const target = getNumber(targetInput);
  const current = getNumber(currentInput);
  if (!title || target <= 0) return;
  const goals = readGoals();
  const goalIndex = goals.findIndex((goal) => goal.id === selectedGoalId);
  if (goalIndex < 0) return;
  goals[goalIndex] = { ...goals[goalIndex], title, target, current };
  saveGoals(goals);
  renderEditorList(goals);
  renderGoal(goals[goalIndex]);
}

form?.addEventListener('input', persistSelectedGoal);

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const target = getNumber(targetInput);
  const current = getNumber(currentInput);

  if (!title || target <= 0) {
    showToast('Informe um título e um valor-alvo maior que zero.');
    if (!title) titleInput.focus();
    else targetInput.focus();
    return;
  }

  const goals = readGoals();
  const goal = { id: selectedGoalId || createId(), title, target, current };
  const existingIndex = goals.findIndex((savedGoal) => savedGoal.id === goal.id);
  if (existingIndex >= 0) goals[existingIndex] = goal;
  else goals.push(goal);
  selectedGoalId = goal.id;
  saveGoals(goals);
  renderEditorList(goals);
  renderGoal(goal);
  showToast(current >= target ? 'Meta concluída. Que conquista bonita!' : 'Progresso salvo.');
});

document.querySelector('#reset-button')?.addEventListener('click', () => {
  selectedGoalId = null;
  form.reset();
  progressArea.style.display = 'none';
  saveLabel.textContent = 'Criar minha meta';
  renderEditorList(readGoals());
  titleInput.focus();
});

document.querySelector('#share-button')?.addEventListener('click', async () => {
  const goals = readGoals();
  if (!goals.length) {
    showToast('Salve uma meta antes de compartilhar.');
    return;
  }
  const publicUrl = getPublicUrl(goals);
  localStorage.setItem('financial-goal-link', publicUrl);
  try {
    await navigator.clipboard.writeText(publicUrl);
    showToast('Link com todas as metas copiado.');
  } catch {
    window.prompt('Copie seu link público:', publicUrl);
  }
});

document.querySelector('#access-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (document.querySelector('#access-pin').value === '0509') {
    document.body.classList.remove('is-locked');
    sessionStorage.setItem('financial-goal-unlocked', 'true');
    document.querySelector('#goal-title')?.focus();
  } else {
    showToast('PIN incorreto.');
  }
});

const hashGoals = window.location.hash.startsWith('#goals=')
  ? decodeGoals(window.location.hash.slice(7))
  : window.location.hash.startsWith('#goal=')
    ? decodeGoals(window.location.hash.slice(6)).filter(Boolean).slice(0, 1)
    : [];
const savedGoals = readGoals();

if (document.body.classList.contains('public-page')) {
  renderPublicGoals(savedGoals.length ? savedGoals : hashGoals);
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;
    renderPublicGoals(event.newValue ? JSON.parse(event.newValue) : []);
  });
} else if (sessionStorage.getItem('financial-goal-unlocked') === 'true') {
  document.body.classList.remove('is-locked');
  selectedGoalId = savedGoals[0]?.id || null;
  fillForm(savedGoals[0] || null);
  renderEditorList(savedGoals);
} else if (form) {
  selectedGoalId = savedGoals[0]?.id || null;
  fillForm(savedGoals[0] || null);
  renderEditorList(savedGoals);
}
