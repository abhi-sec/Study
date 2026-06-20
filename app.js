const API_BASE = '/api/tasks';
const statuses = ['To Do', 'In Progress', 'Under Review', 'Completed'];
// Keep this aligned with server-side REVISION_INTERVALS.
const revisionIntervals = [1, 3, 7, 15, 30, 60, 120];
const expandedTasks = new Set();

let tasks = [];
let deleteTaskId = null;

const elements = {
  openCreateModalBtn: document.getElementById('openCreateModalBtn'),
  taskModal: document.getElementById('taskModal'),
  taskModalTitle: document.getElementById('taskModalTitle'),
  taskForm: document.getElementById('taskForm'),
  cancelTaskBtn: document.getElementById('cancelTaskBtn'),
  taskId: document.getElementById('taskId'),
  title: document.getElementById('title'),
  subject: document.getElementById('subject'),
  description: document.getElementById('description'),
  status: document.getElementById('status'),
  priority: document.getElementById('priority'),
  dueDate: document.getElementById('dueDate'),
  deleteModal: document.getElementById('deleteModal'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
};

const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleDateString();
};
/**
 * Validates and safely encodes MongoDB ObjectId values used in client-built URLs.
 * @param {string} id - 24-character hexadecimal ObjectId string.
 * @returns {string}
 */
const sanitizeId = (id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new Error('Invalid identifier');
  }
  return encodeURIComponent(id);
};

const priorityClass = {
  Low: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
};

const openTaskModal = (task = null) => {
  elements.taskModal.classList.remove('hidden');
  elements.taskModalTitle.textContent = task ? 'Edit Task' : 'Create Task';
  elements.taskId.value = task?._id || '';
  elements.title.value = task?.title || '';
  elements.subject.value = task?.subject || '';
  elements.description.value = task?.description || '';
  elements.status.value = task?.status || 'To Do';
  elements.priority.value = task?.priority || 'Medium';
  elements.dueDate.value = task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
};

const closeTaskModal = () => {
  elements.taskModal.classList.add('hidden');
  elements.taskForm.reset();
  elements.taskId.value = '';
};

const openDeleteModal = (taskId) => {
  deleteTaskId = taskId;
  elements.deleteModal.classList.remove('hidden');
};

const closeDeleteModal = () => {
  deleteTaskId = null;
  elements.deleteModal.classList.add('hidden');
};

const fetchTasks = async () => {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  tasks = await response.json();
  renderBoard();
};

const createTask = async (payload) => {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create task');
};

const updateTask = async (id, payload) => {
  const response = await fetch(`${API_BASE}/${sanitizeId(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update task');
};

const deleteTask = async (id) => {
  const response = await fetch(`${API_BASE}/${sanitizeId(id)}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete task');
};

const toggleRevision = async (taskId, revisionId) => {
  const response = await fetch(`${API_BASE}/${sanitizeId(taskId)}/revision/${sanitizeId(revisionId)}`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error('Failed to toggle revision');
};

const createRevisionList = (task) => {
  if (!task.revisions?.length) return '';
  const isExpanded = expandedTasks.has(task._id);
  return `
    <div class="mt-3 border-t pt-2">
      <button class="text-xs text-blue-600 hover:underline" data-action="toggle-revisions" data-id="${task._id}">
        ${isExpanded ? 'Hide' : 'Show'} Revisions
      </button>
      ${
        isExpanded
          ? `<ul class="mt-2 space-y-1">
            ${task.revisions
              .map(
                (revision) => `
              <li class="text-xs flex items-center gap-2">
                <input type="checkbox" ${revision.isDone ? 'checked' : ''} data-action="toggle-revision" data-task-id="${task._id}" data-revision-id="${revision._id}">
                <span>Day ${revisionIntervals[revision.revisionNumber - 1]} Revision (${formatDate(revision.targetDate)})</span>
              </li>`
              )
              .join('')}
          </ul>`
          : ''
      }
    </div>
  `;
};

const createTaskCard = (task) => {
  const card = document.createElement('article');
  card.className = 'bg-slate-50 border rounded-lg p-3 cursor-grab active:cursor-grabbing';
  card.draggable = true;
  card.dataset.taskId = task._id;
  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-medium">${task.title}</h3>
      <span class="text-xs px-2 py-1 rounded-full ${priorityClass[task.priority] || priorityClass.Medium}">
        ${task.priority}
      </span>
    </div>
    <p class="text-sm text-slate-600 mt-1">${task.subject}</p>
    <p class="text-xs text-slate-500 mt-2">Due: ${formatDate(task.dueDate)}</p>
    <div class="flex gap-3 mt-3">
      <button class="text-xs text-blue-600 hover:underline" data-action="edit" data-id="${task._id}">Edit</button>
      <button class="text-xs text-red-600 hover:underline" data-action="delete" data-id="${task._id}">Delete</button>
    </div>
    ${task.status === 'Completed' ? createRevisionList(task) : ''}
  `;

  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', task._id);
  });

  return card;
};

const renderBoard = () => {
  document.querySelectorAll('.column').forEach((column) => {
    const list = column.querySelector('.task-list');
    list.innerHTML = '';
    const columnTasks = tasks.filter((task) => task.status === column.dataset.status);
    columnTasks.forEach((task) => list.appendChild(createTaskCard(task)));
  });
};

const setupBoardInteractions = () => {
  document.querySelectorAll('.column').forEach((column) => {
    const list = column.querySelector('.task-list');
    list.addEventListener('dragover', (event) => event.preventDefault());
    list.addEventListener('drop', async (event) => {
      event.preventDefault();
      const taskId = event.dataTransfer.getData('text/plain');
      const newStatus = column.dataset.status;
      const task = tasks.find((item) => item._id === taskId);
      if (!task || task.status === newStatus) return;
      await updateTask(taskId, { status: newStatus });
      await fetchTasks();
    });
  });
};

document.body.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const taskId = button.dataset.id;

  if (action === 'edit') {
    const task = tasks.find((item) => item._id === taskId);
    if (task) openTaskModal(task);
    return;
  }

  if (action === 'delete') {
    openDeleteModal(taskId);
    return;
  }

  if (action === 'toggle-revisions') {
    if (expandedTasks.has(taskId)) expandedTasks.delete(taskId);
    else expandedTasks.add(taskId);
    renderBoard();
  }
});

document.body.addEventListener('change', async (event) => {
  const input = event.target;
  if (input.dataset.action !== 'toggle-revision') return;
  await toggleRevision(input.dataset.taskId, input.dataset.revisionId);
  await fetchTasks();
  expandedTasks.add(input.dataset.taskId);
});

elements.openCreateModalBtn.addEventListener('click', () => openTaskModal());
elements.cancelTaskBtn.addEventListener('click', closeTaskModal);
elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

elements.confirmDeleteBtn.addEventListener('click', async () => {
  if (!deleteTaskId) return;
  await deleteTask(deleteTaskId);
  closeDeleteModal();
  await fetchTasks();
});

elements.taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    title: elements.title.value.trim(),
    subject: elements.subject.value.trim(),
    description: elements.description.value.trim(),
    status: elements.status.value,
    priority: elements.priority.value,
    dueDate: elements.dueDate.value ? new Date(elements.dueDate.value) : null,
  };

  if (elements.taskId.value) {
    await updateTask(elements.taskId.value, payload);
  } else {
    await createTask(payload);
  }

  closeTaskModal();
  await fetchTasks();
});

setupBoardInteractions();
fetchTasks().catch((error) => {
  console.error(error);
  alert('Failed to load tasks. Ensure the server is running and MONGODB_URI is configured correctly.');
});
