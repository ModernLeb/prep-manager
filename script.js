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
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytRtxdlH4ri8RMC3SZmo_ezdfiIwjoUWcQpXBoTubEbf2BzEvuLSeR2I6QSoWg7RrW/exec';

// Fix for loadDataFromSheet function
// Replace the current version with this corrected one
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
    saveItemToGoogleSheet(prepItems[currentItemIndex]);
    
    // Update the to-do list in real-time
    updateTodoList();
    
    // Move to next item or complete check
    if (currentItemIndex < prepItems.length - 1) {
        currentItemIndex++;
        showCurrentPrepItem();
    } else {
        completePrepCheck();
    }
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

// Create a reusable slider component
function createTouchSlider(options) {
  const {
    containerId, // Container element ID or element
    valueDisplayId, // Element to display current value
    handleId, // Slider handle element
    progressId, // Progress bar element
    ticksId, // Ticks container element
    decreaseId, // Decrease button ID
    increaseId, // Increase button ID
    hiddenInputId, // Hidden input to store value
    initialValue = 0, // Starting value
    minValue = 0, // Minimum value
    maxValue = 20 // Maximum value
  } = options;
  
  // DOM elements
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  const valueDisplay = document.getElementById(valueDisplayId);
  const handle = document.getElementById(handleId);
  const progress = document.getElementById(progressId);
  const ticksContainer = document.getElementById(ticksId);
  const decreaseBtn = document.getElementById(decreaseId);
  const increaseBtn = document.getElementById(increaseId);
  const hiddenInput = document.getElementById(hiddenInputId);
  
  if (!container || !valueDisplay || !handle || !progress || !ticksContainer) {
    console.error('Missing required elements for slider');
    return null;
  }
  
  // Generate values array with the right increments
  const values = [];
  for (let i = 0; i <= 12; i++) {
    values.push(i * 0.25); // 0 to 3 in 0.25 increments
  }
  for (let i = 4; i <= maxValue; i++) {
    values.push(i); // 4 to 20 in increments of 1
  }
  
  // Instance-specific state
  let currentValue = findClosestValue(initialValue, values);
  let isDragging = false;
  
  // Find closest value in values array
  function findClosestValue(value, valueArray) {
    // Find exact match first
    const exactIndex = valueArray.indexOf(value);
    if (exactIndex !== -1) return value;
    
    // Find closest value
    let closest = valueArray[0];
    let closestDiff = Math.abs(value - closest);
    
    for (const v of valueArray) {
      const diff = Math.abs(value - v);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = v;
      }
    }
    return closest;
  }
  
  // Update the slider display
  function updateSlider() {
    const valueIndex = values.indexOf(currentValue);
    const percentage = valueIndex / (values.length - 1) * 100;
    
    handle.style.left = `${percentage}%`;
    progress.style.width = `${percentage}%`;
    
    // Format display value (show 2 decimal places for values < 3)
    valueDisplay.textContent = currentValue < 3 ? currentValue.toFixed(2) : currentValue.toFixed(0);
    
    // Update hidden input if provided
    if (hiddenInput) {
      hiddenInput.value = currentValue;
      // Trigger change event
      const event = new Event('change');
      hiddenInput.dispatchEvent(event);
    }
  }
  
  // Create tick marks
  function createTicks() {
    // Clear existing ticks
    ticksContainer.innerHTML = '';
    
    values.forEach((val, index) => {
      const percentage = index / (values.length - 1) * 100;
      
      // Create tick mark
      const tick = document.createElement('div');
      tick.className = val % 1 === 0 ? 'tick major' : 'tick';
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
  
  // Event handlers
  function startDragging(e) {
    isDragging = true;
    e.preventDefault();
  }
  
  function stopDragging() {
    isDragging = false;
  }
  
  function handleMove(event) {
    if (!isDragging) return;
    
    const containerRect = container.getBoundingClientRect();
    const clientX = event.type.includes('touch') ? 
      event.touches[0].clientX : event.clientX;
    let percentage = (clientX - containerRect.left) / containerRect.width;
    
    // Clamp percentage
    percentage = Math.max(0, Math.min(percentage, 1));
    
    // Find closest value
    const valueIndex = Math.round(percentage * (values.length - 1));
    currentValue = values[valueIndex];
    
    updateSlider();
    event.preventDefault();
  }
  
  function handleClick(event) {
    if (event.target === handle) return;
    
    const containerRect = container.getBoundingClientRect();
    const percentage = (event.clientX - containerRect.left) / containerRect.width;
    
    // Find closest value
    const valueIndex = Math.round(percentage * (values.length - 1));
    currentValue = values[valueIndex];
    
    updateSlider();
  }
  
  function decreaseValue() {
    const currentIndex = values.indexOf(currentValue);
    if (currentIndex > 0) {
      currentValue = values[currentIndex - 1];
      updateSlider();
    }
  }
  
  function increaseValue() {
    const currentIndex = values.indexOf(currentValue);
    if (currentIndex < values.length - 1) {
      currentValue = values[currentIndex + 1];
      updateSlider();
    }
  }
  
  // Set up event handlers
  handle.addEventListener('mousedown', startDragging);
  handle.addEventListener('touchstart', startDragging);
  
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('touchmove', handleMove, { passive: false });
  
  document.addEventListener('mouseup', stopDragging);
  document.addEventListener('touchend', stopDragging);
  
  container.addEventListener('click', handleClick);
  
  if (decreaseBtn) decreaseBtn.addEventListener('click', decreaseValue);
  if (increaseBtn) increaseBtn.addEventListener('click', increaseValue);
  
  // Initialize
  createTicks();
  updateSlider();
  
  // Return an API for external control
  return {
    setValue: function(value) {
      currentValue = findClosestValue(value, values);
      updateSlider();
    },
    getValue: function() {
      return currentValue;
    },
    destroy: function() {
      // Remove event listeners
      handle.removeEventListener('mousedown', startDragging);
      handle.removeEventListener('touchstart', startDragging);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchend', stopDragging);
      container.removeEventListener('click', handleClick);
      if (decreaseBtn) decreaseBtn.removeEventListener('click', decreaseValue);
      if (increaseBtn) increaseBtn.removeEventListener('click', increaseValue);
    }
  };
}

// Global variable to store the slider instance for the main prep check
let prepCheckSlider;

// New implementation of initTouchInput using the reusable component
function initTouchInput() {
    // Check if the necessary elements exist
    if (document.getElementById('current-value') && document.getElementById('handle')) {
        // Initialize the main prep check slider if not already done
        if (!prepCheckSlider) {
            prepCheckSlider = createTouchSlider({
                containerId: document.querySelector('.slider-container'),
                valueDisplayId: 'current-value',
                handleId: 'handle',
                progressId: 'progress',
                ticksId: 'ticks',
                decreaseId: 'decrease',
                increaseId: 'increase',
                hiddenInputId: 'current-level-input',
                initialValue: 0
            });
        }
    }
}

// Updated show current prep item function
function showCurrentPrepItem() {
    const item = prepItems[currentItemIndex];
    checkProgressElement.textContent = `Item ${currentItemIndex + 1} of ${prepItems.length}`;
    checkItemNameElement.textContent = item.name;
    checkItemTargetElement.textContent = `Target: ${item.targetLevel} ${item.unit}`;
    
    // Reset the slider to 0 using the slider API
    if (prepCheckSlider) {
        prepCheckSlider.setValue(0);
    } else {
        // Fallback if slider isn't initialized yet
        currentLevelInput.value = '0';
    }
}

// New function to save a single item to Google Sheet
function saveItemToGoogleSheet(item) {
    console.log('Saving item to Google Sheet:', item.name);
    
    // Display a message to the user
    const saveMessage = document.createElement('div');
    saveMessage.textContent = `Updating ${item.name}...`;
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
    input.value = JSON.stringify(item);  // Just send this one item
    form.appendChild(input);
    
    // Add the mode parameter to specify this is a single item update
    const modeInput = document.createElement('input');
    modeInput.type = 'hidden';
    modeInput.name = 'mode';
    modeInput.value = 'single';
    form.appendChild(modeInput);
    
    // Add the form to the document
    document.body.appendChild(form);
    
    // When the iframe loads, it means the form submission is complete
    iframe.onload = function() {
        console.log('Item update complete');
        saveMessage.textContent = `${item.name} saved to Google Sheet!`;
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
            saveMessage.textContent = 'Update completed';
            saveMessage.style.backgroundColor = '#4CAF50';
            
            setTimeout(() => {
                if (document.body.contains(saveMessage)) saveMessage.remove();
                if (document.body.contains(form)) form.remove();
                if (document.body.contains(iframe)) iframe.remove();
            }, 2000);
        }
    }, 5000);
}

// Updated modal function to use the reusable slider
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
    
    // Create a variable to hold the slider instance
    let modalSlider;
    
    // Initialize the slider for this modal
    // This needs to happen after the elements are added to the DOM
    setTimeout(() => {
        modalSlider = createTouchSlider({
            containerId: modalContent.querySelector('.slider-container'),
            valueDisplayId: 'modal-current-value',
            handleId: 'modal-handle',
            progressId: 'modal-progress',
            ticksId: 'modal-ticks',
            decreaseId: 'modal-decrease',
            increaseId: 'modal-increase',
            hiddenInputId: 'modal-current-level',
            initialValue: item.currentLevel
        });
    }, 0);
    
    // Function to close modal and clean up
    function closeModal() {
        // Destroy slider to clean up event listeners
        if (modalSlider) {
            modalSlider.destroy();
        }
        document.body.removeChild(modalBackdrop);
    }
    
    // Add event listeners
    cancelButton.addEventListener('click', closeModal);
    
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
            
            // Save only this item to Google Sheet (instead of saveToGoogleSheet())
            saveItemToGoogleSheet(prepItems[itemIndex]);
            
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
        closeModal();
    });
    
    // Close modal if backdrop is clicked
    modalBackdrop.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) {
            closeModal();
        }
    });
}   
