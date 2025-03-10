// Sample initial data
const initialPrepItems = [
    { id: 1, name: 'Chopped Onions', currentLevel: 2, targetLevel: 5, unit: 'containers', lastCheckedBy: 'Alex', lastCheckedTime: '2025-03-09 08:30' },
    { id: 2, name: 'Sliced Tomatoes', currentLevel: 1, targetLevel: 4, unit: 'containers', lastCheckedBy: 'Maria', lastCheckedTime: '2025-03-09 07:45' },
    { id: 3, name: 'Diced Chicken', currentLevel: 0, targetLevel: 3, unit: 'kg', lastCheckedBy: 'John', lastCheckedTime: '2025-03-08 19:20' },
    { id: 4, name: 'Mixed Salad', currentLevel: 3, targetLevel: 4, unit: 'kg', lastCheckedBy: 'Maria', lastCheckedTime: '2025-03-09 09:10' },
    { id: 5, name: 'Sauce Base', currentLevel: 1, targetLevel: 5, unit: 'liters', lastCheckedBy: 'John', lastCheckedTime: '2025-03-08 20:15' }
];

// App state
let prepItems = [...initialPrepItems];
let currentStaff = '';
let currentItemIndex = 0;
let isChecking = false;

// Save data to localStorage
function saveData() {
    localStorage.setItem('prepItems', JSON.stringify(prepItems));
}

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('prepItems');
    if (saved) {
        prepItems = JSON.parse(saved);
        updateInventoryTable();
        updateTodoList();
        updateStats();
    }
}

// Google Sheets configuration
const SHEET_ID = '1brT1NRzBC1Q6pY5CzIpgRDBk7_Vja_t7OwD3kU9dTuM';
const API_KEY = 'AIzaSyBff8Mi1zi4-r7oWmExc-zk1JeI4IDtmQs';
const SHEET_NAME = 'Sheet1'; // Replace if your sheet name is different
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqkQu0MyDffc4otvyjfRVEEYOKY0sQguoNxVy70OuccvvvTS0KXLC95uK6stP1agJQ/exec';

// Load data from Google Sheets
function loadDataFromSheet() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.values || data.values.length <= 1) {
                throw new Error('No data found in the spreadsheet');
            }
            
            const rows = data.values;
            const headers = rows[0];
            const items = [];
            
            for (let i = 1; i < rows.length; i++) {
                const item = {};
                for (let j = 0; j < headers.length && j < rows[i].length; j++) {
                    let value = rows[i][j] ? rows[i][j].toString().trim() : '';
                    
                    if (headers[j] === 'id' || headers[j] === 'currentLevel' || headers[j] === 'targetLevel') {
                        value = parseFloat(value) || 0;
                    }
                    
                    item[headers[j]] = value;
                }
                items.push(item);
            }
            
            if (items.length > 0) {
                prepItems = items;
                updateInventoryTable();
                updateTodoList();
                updateStats();
                console.log('Data loaded from Google Sheets successfully');
            } else {
                throw new Error('No items were successfully parsed');
            }
        })
        .catch(error => {
            console.error('Error loading from Google Sheets:', error);
            loadData(); // Fall back to local data
        });
}

// Function to save data to Google Sheet using iframe form submission
function saveToGoogleSheet() {
    console.log('Saving data to Google Sheet...');
    
    // Display a message to the user
    const saveMessage = document.createElement('div');
    saveMessage.textContent = 'Saving to Google Sheet...';
    saveMessage.style.position = 'fixed';
    saveMessage.style.bottom = '20px';
    saveMessage.style.right = '20px';
    saveMessage.style.padding = '10px';
    saveMessage.style.backgroundColor = '#333';
    saveMessage.style.color = 'white';
    saveMessage.style.borderRadius = '5px';
    saveMessage.style.zIndex = '1000';
    document.body.appendChild(saveMessage);
    
    // Generate a unique name for the iframe
    const iframeName = 'google-sheet-target-' + Date.now();
    
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Create a form that targets the iframe
    const form = document.createElement('form');
    form.action = SCRIPT_URL;
    form.method = 'POST';
    form.target = iframeName; // This makes the form submit to the iframe
    form.style.display = 'none';
    
    // Add the data as a hidden input
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = JSON.stringify(prepItems);
    form.appendChild(input);
    
    // Add the form to the document
    document.body.appendChild(form);
    
    // When the iframe loads, it means the form submission is complete
    iframe.onload = function() {
        console.log('Form submission complete');
        saveMessage.textContent = 'Data saved to Google Sheet!';
        saveMessage.style.backgroundColor = '#4CAF50';
        
        // Clean up
        setTimeout(() => {
            saveMessage.remove();
            iframe.remove();
            form.remove();
        }, 3000);
    };
    
    // Submit the form
    form.submit();
    
    // Handle potential errors with a fallback
    setTimeout(() => {
        if (document.body.contains(saveMessage)) {
            saveMessage.textContent = 'Sheet update completed';
            saveMessage.style.backgroundColor = '#4CAF50';
            
            setTimeout(() => {
                if (document.body.contains(saveMessage)) saveMessage.remove();
                if (document.body.contains(form)) form.remove();
                if (document.body.contains(iframe)) iframe.remove();
            }, 2000);
        }
    }, 5000);
}

// DOM elements
const staffSelectionScreen = document.getElementById('staff-selection');
const mainInterface = document.getElementById('main-interface');
const currentUserElement = document.getElementById('current-user');
const switchUserButton = document.getElementById('switch-user');
const navButtons = document.querySelectorAll('.nav-button');
const contentSections = document.querySelectorAll('.content-section');
const inventoryTableBody = document.getElementById('inventory-table-body');
const todoListContainer = document.getElementById('todo-list-container');
const totalItemsElement = document.getElementById('total-items');
const itemsNeededElement = document.getElementById('items-needed');
const startCheckButton = document.getElementById('start-check-btn');
const prepCheckInterface = document.getElementById('prep-check-interface');
const dashboardSection = document.getElementById('dashboard-section');
const checkProgressElement = document.getElementById('check-progress');
const checkItemNameElement = document.getElementById('check-item-name');
const checkItemTargetElement = document.getElementById('check-item-target');
const currentLevelInput = document.getElementById('current-level-input');
const saveNextButton = document.getElementById('save-next-btn');
const cancelCheckButton = document.getElementById('cancel-check-btn');

// Initialize the app
function initApp() {
    // Set up event listeners
    document.querySelectorAll('.staff-button').forEach(button => {
        button.addEventListener('click', () => {
            currentStaff = button.getAttribute('data-staff');
            showMainInterface();
        });
    });

    switchUserButton.addEventListener('click', () => {
        currentStaff = '';
        showStaffSelection();
    });

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.getAttribute('data-section');
            switchSection(sectionId, button);
        });
    });

    startCheckButton.addEventListener('click', startPrepCheck);
    saveNextButton.addEventListener('click', saveAndNext);
    cancelCheckButton.addEventListener('click', cancelPrepCheck);

    // Initialize UI
    updateInventoryTable();
    updateTodoList();
    updateStats();
    
    // Load saved data
    loadData();
    
    // Load data from Google Sheets
    loadDataFromSheet();
    
    // Add CSS for quick update button
    const style = document.createElement('style');
    style.textContent = `
        .quick-update-btn {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin-top: 10px;
            transition: background-color 0.3s;
        }
        .quick-update-btn:hover {
            background-color: #2980b9;
        }
    `;
    document.head.appendChild(style);
}

// Show main interface after staff selection
function showMainInterface() {
    staffSelectionScreen.style.display = 'none';
    mainInterface.style.display = 'flex';
    currentUserElement.textContent = currentStaff;
    
    // Default to dashboard section
    switchSection('dashboard', document.querySelector('[data-section="dashboard"]'));
}

// Show staff selection screen
function showStaffSelection() {
    mainInterface.style.display = 'none';
    staffSelectionScreen.style.display = 'flex';
}

// Switch between different sections (dashboard, inventory, history)
function switchSection(sectionId, buttonElement) {
    // Update active nav button
    navButtons.forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    
    // Show selected section, hide others
    contentSections.forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(`${sectionId}-section`).style.display = 'block';
}

// Update inventory table
function updateInventoryTable() {
    inventoryTableBody.innerHTML = '';
    
    prepItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.currentLevel} ${item.unit}</td>
            <td>${item.targetLevel} ${item.unit}</td>
            <td>${item.lastCheckedTime}</td>
            <td>${item.lastCheckedBy}</td>
        `;
        inventoryTableBody.appendChild(row);
    });
}

// Update to-do list with clickable items
function updateTodoList() {
    // Calculate preps to do (items below 50% of target)
    const prepToDo = prepItems
        .filter(item => item.currentLevel < item.targetLevel * 0.5)
        .sort((a, b) => (a.currentLevel / a.targetLevel) - (b.currentLevel / b.targetLevel));
    
    todoListContainer.innerHTML = '';
    
    if (prepToDo.length === 0) {
        todoListContainer.innerHTML = '<div class="todo-empty">All items are at good levels!</div>';
        return;
    }
    
    prepToDo.forEach(item => {
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-item';
        todoItem.innerHTML = `
            <div class="todo-item-name">${item.name}</div>
            <div class="todo-item-detail">Current: ${item.currentLevel} ${item.unit}</div>
            <div class="todo-item-detail">Need: ${item.targetLevel - item.currentLevel} ${item.unit} more</div>
            <div class="todo-tag ${item.currentLevel === 0 ? 'urgent' : 'low'}">
                ${item.currentLevel === 0 ? 'Urgent' : 'Low'}
            </div>
            <button class="quick-update-btn">Update</button>
        `;
        
        // Add click event to the Update button
        const updateBtn = todoItem.querySelector('.quick-update-btn');
        updateBtn.addEventListener('click', () => {
            showQuickUpdateModal(item);
        });
        
        todoListContainer.appendChild(todoItem);
    });
}

// New function to show a quick update modal
function showQuickUpdateModal(item) {
    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.style.position = 'fixed';
    modalBackdrop.style.top = '0';
    modalBackdrop.style.left = '0';
    modalBackdrop.style.width = '100%';
    modalBackdrop.style.height = '100%';
    modalBackdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalBackdrop.style.display = 'flex';
    modalBackdrop.style.justifyContent = 'center';
    modalBackdrop.style.alignItems = 'center';
    modalBackdrop.style.zIndex = '1001';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '400px';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.style.marginBottom = '15px';
    modalHeader.innerHTML = `
        <h3 style="margin: 0; color: #333;">Update ${item.name}</h3>
        <p style="margin: 5px 0;">Current: ${item.currentLevel} ${item.unit} | Target: ${item.targetLevel} ${item.unit}</p>
    `;
    
    // Create input group
    const inputGroup = document.createElement('div');
    inputGroup.style.marginBottom = '15px';
    
    const label = document.createElement('label');
    label.textContent = 'New quantity:';
    label.style.display = 'block';
    label.style.marginBottom = '5px';
    label.style.fontWeight = 'bold';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.5';
    input.value = item.currentLevel;
    input.style.width = '100%';
    input.style.padding = '8px';
    input.style.boxSizing = 'border-box';
    input.style.border = '1px solid #ddd';
    input.style.borderRadius = '4px';
    
    inputGroup.appendChild(label);
    inputGroup.appendChild(input);
    
    // Create buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.justifyContent = 'space-between';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.padding = '8px 16px';
    saveButton.style.backgroundColor = '#4CAF50';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.cursor = 'pointer';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.backgroundColor = '#f1f1f1';
    cancelButton.style.color = '#333';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    
    buttonGroup.appendChild(cancelButton);
    buttonGroup.appendChild(saveButton);
    
    // Add all elements to modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(inputGroup);
    modalContent.appendChild(buttonGroup);
    modalBackdrop.appendChild(modalContent);
    
    // Add modal to document
    document.body.appendChild(modalBackdrop);
    
    // Focus the input
    input.focus();
    
    // Add event listeners
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    saveButton.addEventListener('click', () => {
        const newValue = parseFloat(input.value);
        if (isNaN(newValue) || newValue < 0) {
            alert('Please enter a valid number');
            return;
        }
        
        // Find the item in the prepItems array
        const itemIndex = prepItems.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
            // Update the item
            prepItems[itemIndex].currentLevel = newValue;
            prepItems[itemIndex].lastCheckedBy = currentStaff;
            prepItems[itemIndex].lastCheckedTime = new Date().toLocaleString();
            
            // Save to localStorage
            saveData();
            
            // Save to Google Sheet
            saveToGoogleSheet();
            
            // Update UI
            updateInventoryTable();
            updateTodoList();
            updateStats();
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.textContent = `${item.name} updated to ${newValue} ${item.unit}`;
            successMessage.style.position = 'fixed';
            successMessage.style.bottom = '20px';
            successMessage.style.right = '20px';
            successMessage.style.padding = '10px';
            successMessage.style.backgroundColor = '#4CAF50';
            successMessage.style.color = 'white';
            successMessage.style.borderRadius = '5px';
            successMessage.style.zIndex = '1000';
            document.body.appendChild(successMessage);
            
            setTimeout(() => {
                if (document.body.contains(successMessage)) {
                    document.body.removeChild(successMessage);
                }
            }, 3000);
        }
        
        // Close modal
        document.body.removeChild(modalBackdrop);
    });
    
    // Close modal if backdrop is clicked
    modalBackdrop.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) {
            document.body.removeChild(modalBackdrop);
        }
    });
    
    // Handle Enter key press
    input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            saveButton.click();
        }
    });
}

// Update statistics
function updateStats() {
    totalItemsElement.textContent = prepItems.length;
    
    const itemsNeeded = prepItems.filter(item => item.currentLevel < item.targetLevel * 0.5).length;
    itemsNeededElement.textContent = itemsNeeded;
}

// Start prep check process
function startPrepCheck() {
    isChecking = true;
    currentItemIndex = 0;
    dashboardSection.style.display = 'none';
    prepCheckInterface.style.display = 'block';
    showCurrentPrepItem();
}

// Show current prep item in check interface
function showCurrentPrepItem() {
    const item = prepItems[currentItemIndex];
    checkProgressElement.textContent = `Item ${currentItemIndex + 1} of ${prepItems.length}`;
    checkItemNameElement.textContent = item.name;
    checkItemTargetElement.textContent = `Target: ${item.targetLevel} ${item.unit}`;
    currentLevelInput.value = '';
}

// Save current item level and move to next
function saveAndNext() {
    if (currentLevelInput.value === '') {
        alert('Please enter a current level');
        return;
    }
    
    // Update prep item with new level
    prepItems[currentItemIndex].currentLevel = parseFloat(currentLevelInput.value);
    prepItems[currentItemIndex].lastCheckedBy = currentStaff;
    prepItems[currentItemIndex].lastCheckedTime = new Date().toLocaleString();

    // Save data to localStorage
    saveData();
    
    // Save data to Google Sheet
    saveToGoogleSheet();
    
    // Move to next item or complete check
    if (currentItemIndex < prepItems.length - 1) {
        currentItemIndex++;
        showCurrentPrepItem();
    } else {
        completePrepCheck();
    }
}

// Complete prep check
function completePrepCheck() {
    isChecking = false;
    prepCheckInterface.style.display = 'none';
    dashboardSection.style.display = 'block';
    
    // Update UI with new data
    updateInventoryTable();
    updateTodoList();
    updateStats();
    
    // Save final data to Google Sheet
    saveToGoogleSheet();
}

// Cancel prep check
function cancelPrepCheck() {
    isChecking = false;
    prepCheckInterface.style.display = 'none';
    dashboardSection.style.display = 'block';
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', initApp);