// Add these at the top of your script.js file
let googleAuthToken = '';
let googleUser = null;

// Initialize auth state from localStorage if available
try {
    const savedAuth = localStorage.getItem('googleAuthToken');
    if (savedAuth) {
        googleAuthToken = savedAuth;
    }
} catch (e) {
    console.error('Error loading auth from localStorage:', e);
}

// Replace your handleCredentialResponse function with this:
function handleCredentialResponse(response) {
    console.log('Google Auth response received');
    
    // Store the credential
    googleAuthToken = response.credential;
    
    // Save to localStorage for persistence
    try {
        localStorage.setItem('googleAuthToken', googleAuthToken);
    } catch (e) {
        console.error('Error saving auth to localStorage:', e);
    }
    
    // Parse the JWT to get user info
    try {
        const payload = JSON.parse(atob(googleAuthToken.split('.')[1]));
        googleUser = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };
        console.log('Authenticated as:', googleUser.name);
    } catch (e) {
        console.error('Error parsing auth token:', e);
    }
    
    // Check if the DOM elements exist before trying to modify them
    const authContainer = document.getElementById('google-auth-container');
    const appContainer = document.getElementById('app');
    
    if (authContainer && appContainer) {
        // Hide auth container and show the app
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        
        // Initialize the application now that we're authenticated
        initApp();
    } else {
        console.error('DOM elements not found. Auth container or app container is missing.');
        // Add a fallback to reload the page if elements aren't found
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}

// And replace your DOMContentLoaded event listener with this:
document.addEventListener('DOMContentLoaded', function() {
    // Get references to necessary DOM elements
    const authContainer = document.getElementById('google-auth-container');
    const appContainer = document.getElementById('app');
    
    // Ensure the elements exist before proceeding
    if (!authContainer || !appContainer) {
        console.error('Required DOM elements not found!');
        return;
    }
    
    // Check if we already have auth
    if (googleAuthToken) {
        // Already authenticated, hide auth container and initialize
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        
        // Initialize the application now that we're authenticated
        initApp();
    } else {
        // Need authentication, hide app and show auth container
        appContainer.style.display = 'none';
        authContainer.style.display = 'flex';
    }
});

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

// Modified loadDataFromSheet function to use auth token
function loadDataFromSheet() {
    return new Promise((resolve, reject) => {
        console.log('Starting to load data from Google Sheets...');
        
        // Check if we have auth
        if (!googleAuthToken) {
            console.error('No authentication token available');
            reject(new Error('Authentication required'));
            return;
        }
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
        
        // Set up headers with authentication
        const headers = {
            'Authorization': `Bearer ${googleAuthToken}`
        };
        
        fetch(url, { headers })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Data received from Google Sheets');
                
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
                    
                    // Save the freshly loaded items to localStorage as a backup
                    saveData();
                    
                    resolve(true);
                } else {
                    reject(new Error('No items were successfully parsed'));
                }
            })
            .catch(error => {
                console.error('Error in Google Sheets data loading:', error);
                reject(error);
            });
    });
}

// Updated saveToGoogleSheet function to use auth token
function saveToGoogleSheet() {
    console.log('Saving data to Google Sheet...');
    
    // Check if we have auth
    if (!googleAuthToken) {
        console.error('No authentication token available');
        alert('Authentication required to save data. Please sign in again.');
        return;
    }
    
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
    
    // Add the auth token as a hidden input
    const authInput = document.createElement('input');
    authInput.type = 'hidden';
    authInput.name = 'auth';
    authInput.value = googleAuthToken;
    form.appendChild(authInput);
    
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

// Modify your initApp function to prioritize Google Sheets data
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

    // Initialize UI with loading indicators
    showLoadingState();
    
    // Load data from Google Sheets as primary source
    loadDataFromSheet()
        .then(success => {
            // If Google Sheets load succeeded, we're done
            hideLoadingState();
            console.log('Data loaded from Google Sheets successfully');
        })
        .catch(error => {
            // Only if Google Sheets fails, fall back to localStorage
            console.error('Error loading from Google Sheets:', error);
            loadData();
            hideLoadingState();
        });
    
    // Add CSS for clickable todo items
    const style = document.createElement('style');
    style.textContent = `
        .todo-item {
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .todo-item:active {
            background-color: #f5f5f5;
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
    
    // Refresh data when switching to specific sections
    if (sectionId === 'inventory') {
        updateInventoryTable();
    } else if (sectionId === 'dashboard') {
        updateStats();
        updateTodoList();
    }
}

// Update inventory table with more robust time-based sorting
function updateInventoryTable() {
    inventoryTableBody.innerHTML = '';
    
    // Create a copy of the prepItems array to avoid modifying the original
    const sortedItems = [...prepItems];
    
    // Log the items before sorting for debugging
    console.log('Items before sorting:', sortedItems.map(item => ({
        name: item.name,
        lastCheckedTime: item.lastCheckedTime
    })));
    
    // Sort items by lastCheckedTime (most recent first) with robust date parsing
    sortedItems.sort((a, b) => {
        // Try to parse dates in various formats
        let dateA, dateB;
        
        try {
            // First try direct Date constructor
            dateA = new Date(a.lastCheckedTime);
            dateB = new Date(b.lastCheckedTime);
            
            // Check if dates are valid
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                throw new Error('Invalid date');
            }
        } catch (e) {
            // Fallback: try to parse manually (assuming format: YYYY-MM-DD HH:MM or similar)
            try {
                const partsA = a.lastCheckedTime.split(/[- :]/);
                const partsB = b.lastCheckedTime.split(/[- :]/);
                
                dateA = new Date(
                    parseInt(partsA[0]), 
                    parseInt(partsA[1]) - 1, 
                    parseInt(partsA[2]), 
                    parseInt(partsA[3] || 0), 
                    parseInt(partsA[4] || 0)
                );
                
                dateB = new Date(
                    parseInt(partsB[0]), 
                    parseInt(partsB[1]) - 1, 
                    parseInt(partsB[2]), 
                    parseInt(partsB[3] || 0), 
                    parseInt(partsB[4] || 0)
                );
            } catch (err) {
                // If all parsing fails, use string comparison as last resort
                return b.lastCheckedTime.localeCompare(a.lastCheckedTime);
            }
        }
        
        // Sort in descending order (most recent first)
        return dateB - dateA;
    });
    
    // Log the items after sorting for debugging
    console.log('Items after sorting:', sortedItems.map(item => ({
        name: item.name,
        lastCheckedTime: item.lastCheckedTime
    })));
    
    // Create table rows for each item
    sortedItems.forEach(item => {
        const row = document.createElement('tr');
        
        // Calculate how recent the check was
        let isRecent = false;
        try {
            const checkDate = new Date(item.lastCheckedTime);
            const now = new Date();
            const diffTime = Math.abs(now - checkDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Add highlight class for recently checked items (within the last day)
            isRecent = (diffDays < 1);
        } catch (e) {
            // If date parsing fails, don't highlight
            console.log('Date parsing failed for', item.name, item.lastCheckedTime);
        }
        
        if (isRecent) {
            row.classList.add('recently-checked');
        }
        
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
        `;
        
        // Make the entire card clickable
        todoItem.addEventListener('click', () => {
            showQuickUpdateModal(item);
        });
        
        todoListContainer.appendChild(todoItem);
    });
}

// New function to show a quick update modal with slider
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
    modalContent.style.width = '90%';
    modalContent.style.maxWidth = '450px';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.style.marginBottom = '15px';
    modalHeader.innerHTML = `
        <h3 style="margin: 0; color: #333;">Update ${item.name}</h3>
        <p style="margin: 5px 0;">Current: ${item.currentLevel} ${item.unit} | Target: ${item.targetLevel} ${item.unit}</p>
    `;
    
    // Create input group with hidden input
    const inputGroup = document.createElement('div');
    inputGroup.style.marginBottom = '15px';
    
    const label = document.createElement('label');
    label.textContent = 'New quantity:';
    label.style.display = 'block';
    label.style.marginBottom = '5px';
    label.style.fontWeight = 'bold';
    
    // Hidden input to store the value
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'modal-current-level';
    hiddenInput.value = item.currentLevel;
    
    // Create touch-friendly slider control
    const touchInput = document.createElement('div');
    touchInput.className = 'touch-input-container';
    touchInput.innerHTML = `
        <div class="value-display">
            <span id="modal-current-value">${item.currentLevel}</span>
        </div>
        
        <div class="control-row">
            <button class="control-button" id="modal-decrease">-</button>
            <button class="control-button" id="modal-increase">+</button>
        </div>
        
        <div class="slider-container">
            <div class="slider-track"></div>
            <div class="slider-progress" id="modal-progress"></div>
            <div class="slider-handle" id="modal-handle"></div>
            <div class="tick-marks" id="modal-ticks"></div>
        </div>
    `;
    
    inputGroup.appendChild(label);
    inputGroup.appendChild(hiddenInput);
    inputGroup.appendChild(touchInput);
    
    // Create buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.justifyContent = 'space-between';
    buttonGroup.style.marginTop = '20px';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.padding = '10px 20px';
    saveButton.style.backgroundColor = '#4CAF50';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.cursor = 'pointer';
    saveButton.style.fontWeight = 'bold';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '10px 20px';
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
    
    // Initialize the slider for this modal
    initModalSlider(item.currentLevel);
    
    // Add event listeners
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    saveButton.addEventListener('click', () => {
        const newValue = parseFloat(hiddenInput.value);
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
}

// Initialize the slider for the modal
function initModalSlider(initialValue) {
    // DOM elements
    const currentValue = document.getElementById('modal-current-value');
    const decreaseBtn = document.getElementById('modal-decrease');
    const increaseBtn = document.getElementById('modal-increase');
    const handle = document.getElementById('modal-handle');
    const progress = document.getElementById('modal-progress');
    const sliderContainer = document.querySelector('.modal-content .slider-container');
    const ticksContainer = document.getElementById('modal-ticks');
    const hiddenInput = document.getElementById('modal-current-level');
    
    // If elements don't exist, exit
    if (!currentValue || !sliderContainer) return;
    
    // Define value range and increments
    let modalValue = initialValue || 0;
    
    // Generate values array with the right increments
    const modalValues = [];
    for (let i = 0; i <= 12; i++) {
        modalValues.push(i * 0.25); // 0 to 3 in 0.25 increments
    }
    for (let i = 4; i <= 20; i++) {
        modalValues.push(i); // 4 to 20 in increments of 1
    }
    
    // Create tick marks
    modalValues.forEach((val, index) => {
        const percentage = index / (modalValues.length - 1) * 100;
        const tick = document.createElement('div');
        tick.className = 'tick';
        if (val % 1 === 0) tick.className += ' major';
        tick.style.left = `${percentage}%`;
        ticksContainer.appendChild(tick);
        
        // Add labels for whole numbers (but not for every number to avoid crowding)
        if (val % 1 === 0 && (val <= 3 || val % 2 === 0)) {
            const label = document.createElement('div');
            label.className = 'tick-label';
            label.textContent = val;
            label.style.left = `${percentage}%`;
            ticksContainer.appendChild(label);
        }
    });
    
    // Update slider display
    function updateModalSlider() {
        const valueIndex = findClosestValueIndex(modalValue, modalValues);
        const percentage = valueIndex / (modalValues.length - 1) * 100;
        handle.style.left = `${percentage}%`;
        progress.style.width = `${percentage}%`;
        
        // Format display value (show 2 decimal places for values < 3)
        currentValue.textContent = modalValue < 3 ? modalValue.toFixed(2) : modalValue.toFixed(0);
        
        // Update the hidden input
        hiddenInput.value = modalValue;
    }
    
    // Find closest value index
    function findClosestValueIndex(value, values) {
        // Find exact match first
        const exactIndex = values.indexOf(value);
        if (exactIndex !== -1) return exactIndex;
        
        // Find closest value
        let closestIndex = 0;
        let minDiff = Math.abs(values[0] - value);
        
        for (let i = 1; i < values.length; i++) {
            const diff = Math.abs(values[i] - value);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }
        
        return closestIndex;
    }
    
    // Touch and mouse events for slider
    let isDragging = false;
    
    handle.addEventListener('mousedown', () => {
        isDragging = true;
    });
    handle.addEventListener('touchstart', (e) => {
        isDragging = true;
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', handleModalMove);
    document.addEventListener('touchmove', handleModalMove, { passive: false });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    document.addEventListener('touchend', () => {
        isDragging = false;
    });
    
    function handleModalMove(event) {
        if (!isDragging) return;
        
        // Get pointer position
        const containerRect = sliderContainer.getBoundingClientRect();
        const clientX = event.type.includes('touch') ? 
            event.touches[0].clientX : event.clientX;
        let percentage = (clientX - containerRect.left) / containerRect.width;
        
        // Clamp percentage
        percentage = Math.max(0, Math.min(percentage, 1));
        
        // Find closest value
        const valueIndex = Math.round(percentage * (modalValues.length - 1));
        modalValue = modalValues[valueIndex];
        
        updateModalSlider();
        event.preventDefault();
    }
    
    // Allow clicking/tapping anywhere on the slider track
sliderContainer.addEventListener('click', function(event) {
    if (event.target === handle) return;
    
    const containerRect = sliderContainer.getBoundingClientRect();
    const percentage = (event.clientX - containerRect.left) / containerRect.width;
    
    // Find closest value
    const valueIndex = Math.round(percentage * (modalValues.length - 1));
    modalValue = modalValues[valueIndex];
    
    updateModalSlider();
});
    
    // Plus/minus buttons
    decreaseBtn.addEventListener('click', function() {
        const currentIndex = findClosestValueIndex(modalValue, modalValues);
        if (currentIndex > 0) {
            modalValue = modalValues[currentIndex - 1];
            updateModalSlider();
        }
    });
    
    increaseBtn.addEventListener('click', function() {
        const currentIndex = findClosestValueIndex(modalValue, modalValues);
        if (currentIndex < modalValues.length - 1) {
            modalValue = modalValues[currentIndex + 1];
            updateModalSlider();
        }
    });
    
    // Initialize with current value
    updateModalSlider();
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
        
    // Initialize the touch input for the current item
    initTouchInput();
}

// Show current prep item in check interface
function showCurrentPrepItem() {
    const item = prepItems[currentItemIndex];
    checkProgressElement.textContent = `Item ${currentItemIndex + 1} of ${prepItems.length}`;
    checkItemNameElement.textContent = item.name;
    checkItemTargetElement.textContent = `Target: ${item.targetLevel} ${item.unit}`;
    
    // Set the current level in the hidden input
    currentLevelInput.value = '0';
    
    // Reset the touch input to show the current item's value
    if (document.getElementById('current-value')) {
        document.getElementById('current-value').textContent = '0';
        // Update the slider position
        updateSliderPosition(0);
    }
}

function saveAndNext() {
    // Get the value and explicitly check for undefined/null/empty
    const currentValue = currentLevelInput.value;
    console.log("Current value:", currentValue); // This helps debug

    // Check if a value has been set (including zero)
    // We convert to a number and check if it's a valid number including zero
    if (currentValue === '' || isNaN(parseFloat(currentValue))) {
        alert('Please select a current level');
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
// Add loading state indicators
function showLoadingState() {
    // Add loading indicators to the UI
    inventoryTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading data from Google Sheets...</td></tr>';
    todoListContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Loading...</div>';
    
    // Disable buttons during loading
    startCheckButton.disabled = true;
    
    // Add a loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.id = 'loading-message';
    loadingMessage.style.position = 'fixed';
    loadingMessage.style.bottom = '20px';
    loadingMessage.style.right = '20px';
    loadingMessage.style.padding = '10px';
    loadingMessage.style.backgroundColor = '#3b82f6';
    loadingMessage.style.color = 'white';
    loadingMessage.style.borderRadius = '5px';
    loadingMessage.style.zIndex = '1000';
    loadingMessage.textContent = 'Loading data from Google Sheets...';
    document.body.appendChild(loadingMessage);
}

// Remove loading state indicators
function hideLoadingState() {
    // Re-enable buttons
    startCheckButton.disabled = false;
    
    // Remove loading message
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Touch-friendly numeric input functionality
let sliderValues = [];
let currentSliderValue = 0;

// Initialize the touch-friendly input
function initTouchInput() {
    // DOM elements
    const currentValue = document.getElementById('current-value');
    const decreaseBtn = document.getElementById('decrease');
    const increaseBtn = document.getElementById('increase');
    const handle = document.getElementById('handle');
    const progress = document.getElementById('progress');
    const sliderContainer = document.querySelector('.slider-container');
    const ticksContainer = document.getElementById('ticks');
    
    // If elements don't exist yet, exit
    if(!currentValue || !sliderContainer) return;
    
    // Generate values array with the right increments if not already generated
    if (sliderValues.length === 0) {
        // Clear existing ticks first
        ticksContainer.innerHTML = '';
        
        // Generate values array with the right increments
        for (let i = 0; i <= 12; i++) {
            sliderValues.push(i * 0.25); // 0 to 3 in 0.25 increments
        }
        for (let i = 4; i <= 20; i++) {
            sliderValues.push(i); // 4 to 20 in increments of 1
        }
        
        // Create tick marks
        sliderValues.forEach((val, index) => {
            const percentage = index / (sliderValues.length - 1) * 100;
            const tick = document.createElement('div');
            tick.className = 'tick';
            if (val % 1 === 0) tick.className += ' major';
            tick.style.left = `${percentage}%`;
            ticksContainer.appendChild(tick);
            
            // Add labels for whole numbers (but not for every number to avoid crowding)
            if (val % 1 === 0 && (val <= 3 || val % 2 === 0)) {
                const label = document.createElement('div');
                label.className = 'tick-label';
                label.textContent = val;
                label.style.left = `${percentage}%`;
                ticksContainer.appendChild(label);
            }
        });
    }
    
    // Set up event handlers if they haven't been set up yet
    if (!handle.hasAttribute('data-initialized')) {
        // Touch and mouse events for slider
        handle.addEventListener('mousedown', startDragging);
        handle.addEventListener('touchstart', startDragging);
        
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('touchend', stopDragging);
        
        // Allow clicking/tapping anywhere on the slider track
        sliderContainer.addEventListener('click', handleSliderClick);
        
        // Plus/minus buttons
        decreaseBtn.addEventListener('click', decreaseValue);
        increaseBtn.addEventListener('click', increaseValue);
        
        // Mark as initialized to avoid setting up listeners multiple times
        handle.setAttribute('data-initialized', 'true');
    }
    
    // Initialize with value 0
    updateSliderValue(0);
}

// Update the slider value and position
function updateSliderValue(newValue) {
    currentSliderValue = newValue;
    const currentValue = document.getElementById('current-value');
    const hiddenInput = document.getElementById('current-level-input');
    
    if (currentValue) {
        // Format display value (show 2 decimal places for values < 3)
        currentValue.textContent = currentSliderValue < 3 ? currentSliderValue.toFixed(2) : currentSliderValue.toFixed(0);
    }
    
    if (hiddenInput) {
        // Update the hidden input for form submission
        hiddenInput.value = currentSliderValue;
        
        // Trigger change event on hidden input for any listeners
        const event = new Event('change');
        hiddenInput.dispatchEvent(event);
    }
    
    updateSliderPosition(currentSliderValue);
}

// Update the slider position based on a value
function updateSliderPosition(value) {
    const handle = document.getElementById('handle');
    const progress = document.getElementById('progress');
    
    if (!handle || !progress) return;
    
    const valueIndex = sliderValues.indexOf(value);
    if (valueIndex === -1) return;
    
    const percentage = valueIndex / (sliderValues.length - 1) * 100;
    handle.style.left = `${percentage}%`;
    progress.style.width = `${percentage}%`;
}

// Event handlers for slider
let isDragging = false;

function startDragging(event) {
    isDragging = true;
    event.preventDefault();
}

function stopDragging() {
    isDragging = false;
}

function handleMove(event) {
    if (!isDragging) return;
    
    // Get pointer position
    const sliderContainer = document.querySelector('.slider-container');
    if (!sliderContainer) return;
    
    const containerRect = sliderContainer.getBoundingClientRect();
    const clientX = event.type.includes('touch') ? 
        event.touches[0].clientX : event.clientX;
    let percentage = (clientX - containerRect.left) / containerRect.width;
    
    // Clamp percentage
    percentage = Math.max(0, Math.min(percentage, 1));
    
    // Find closest value
    const valueIndex = Math.round(percentage * (sliderValues.length - 1));
    const newValue = sliderValues[valueIndex];
    
    updateSliderValue(newValue);
    event.preventDefault();
}

function handleSliderClick(event) {
    const handle = document.getElementById('handle');
    if (event.target === handle) return;
    
    const sliderContainer = document.querySelector('.slider-container');
    if (!sliderContainer) return;
    
    const containerRect = sliderContainer.getBoundingClientRect();
    const percentage = (event.clientX - containerRect.left) / containerRect.width;
    
    // Find closest value
    const valueIndex = Math.round(percentage * (sliderValues.length - 1));
    const newValue = sliderValues[valueIndex];
    
    updateSliderValue(newValue);
}

function decreaseValue() {
    const currentIndex = sliderValues.indexOf(currentSliderValue);
    if (currentIndex > 0) {
        updateSliderValue(sliderValues[currentIndex - 1]);
    }
}

function increaseValue() {
    const currentIndex = sliderValues.indexOf(currentSliderValue);
    if (currentIndex < sliderValues.length - 1) {
        updateSliderValue(sliderValues[currentIndex + 1]);
    }
}

// Replace your existing DOMContentLoaded event listener with this:
document.addEventListener('DOMContentLoaded', function() {
    // Check if we already have auth
    if (googleAuthToken) {
        // Already authenticated, hide auth container and initialize
        document.getElementById('google-auth-container').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        initApp();
    } else {
        // Need authentication, hide app and show auth container
        document.getElementById('app').style.display = 'none';
        document.getElementById('google-auth-container').style.display = 'flex';
    }
});
