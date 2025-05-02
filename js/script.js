// DOM Elements
const loadingScreen = document.querySelector('.loading-screen');
const progressBar = document.querySelector('.progress');
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const nameInput = document.getElementById('name-input');
const authButton = document.getElementById('auth-button');
const authToggle = document.getElementById('auth-toggle');
const authError = document.getElementById('auth-error');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authToggleText = document.getElementById('auth-toggle-text');
const avatarUpload = document.getElementById('avatar-upload');
const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const app = document.getElementById('app');
const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const addChannelBtn = document.getElementById('add-channel');
const channelsList = document.getElementById('channels-list');
const channelTitle = document.getElementById('channel-title');
const channelDescription = document.getElementById('channel-description');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');
const typingText = document.getElementById('typing-text');
const toggleMembersBtn = document.getElementById('toggle-members');
const membersSidebar = document.getElementById('members-sidebar');
const membersList = document.getElementById('members-list');
const onlineCount = document.getElementById('online-count');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBuctpntNGnL0kV3URvnSEjQaRLD6CguSM",
  authDomain: "elegrey-hut.firebaseapp.com",
  databaseURL: "https://elegrey-hut-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "elegrey-hut",
  storageBucket: "elegrey-hut.appspot.com",
  messagingSenderId: "593273296442",
  appId: "1:593273296442:web:cd7310fb192f4d16458703"
};

// Initialize Firebase
const appFirebase = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// State
let isSignUp = false;
let currentUser = null;
let currentChannel = 'general';
let isTyping = false;
let typingTimeout;
let avatarFile = null;
let channels = {};
let users = {};
let typingUsers = {};

// Loading Screen Animation
let progress = 0;
const loadingInterval = setInterval(() => {
  progress += Math.random() * 20;
  if (progress > 100) progress = 100;
  progressBar.style.width = `${progress}%`;
  
  if (progress === 100) {
    clearInterval(loadingInterval);
    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 1000);
    }, 500);
  }
}, 200);

// Show Auth Modal
function showAuthModal() {
  authModal.classList.add('active');
}

// Show Auth Error
function showAuthError(message) {
  authError.textContent = message;
}

// Toggle between Sign In and Sign Up
function toggleAuthMode() {
  isSignUp = !isSignUp;
  
  if (isSignUp) {
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Join Elegrey Hut today';
    authButton.textContent = 'Sign Up';
    authToggleText.textContent = 'Already have an account?';
    authToggle.textContent = 'Sign in';
    avatarUpload.style.display = 'flex';
    document.getElementById('name-group').style.display = 'flex';
  } else {
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Sign in to continue to Elegrey Hut';
    authButton.textContent = 'Sign In';
    authToggleText.textContent = 'Don\'t have an account?';
    authToggle.textContent = 'Sign up';
    avatarUpload.style.display = 'none';
    document.getElementById('name-group').style.display = 'none';
  }
  
  authError.textContent = '';
  emailInput.value = '';
  passwordInput.value = '';
  nameInput.value = '';
}

// Show Notification
function showNotification(message) {
  notificationMessage.textContent = message;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Setup Event Listeners
function setupEventListeners() {
  // Auth toggle
  authToggle.addEventListener('click', toggleAuthMode);
  
  // Avatar upload
  avatarPreview.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      avatarFile = file;
      const reader = new FileReader();
      reader.onload = (event) => {
        avatarPreview.style.backgroundImage = `url(${event.target.result})`;
      };
      reader.readAsDataURL(file);
    }
  });

  // Auth form submission
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
      showAuthError('Please fill in all fields');
      return;
    }

    try {
      authButton.disabled = true;
      authButton.textContent = isSignUp ? 'Signing Up...' : 'Signing In...';

      if (isSignUp) {
        const name = nameInput.value.trim();
        if (!name) {
          showAuthError('Please enter a username');
          return;
        }
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        let avatarUrl = null;
        if (avatarFile) {
          const storageRef = storage.ref(`avatars/${currentUser.uid}`);
          await storageRef.put(avatarFile);
          avatarUrl = await storageRef.getDownloadURL();
        }
        
        await database.ref('users/' + currentUser.uid).set({
          name: name,
          email: email,
          avatar: avatarUrl,
          createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        initChat();
      } else {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        await loadUserData();
      }
      
      authModal.classList.remove('active');
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = error.message;
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Please sign in.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      }
      
      showAuthError(errorMessage);
    } finally {
      authButton.disabled = false;
      authButton.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
  });
  
  // Sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('active');
  });
  
  // Members sidebar toggle
  toggleMembersBtn.addEventListener('click', () => {
    membersSidebar.classList.toggle('active');
  });

  // Message input events
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    
    if (!isTyping) {
      isTyping = true;
      database.ref('typing/' + currentChannel + '/' + currentUser.uid).set(true);
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isTyping = false;
      database.ref('typing/' + currentChannel + '/' + currentUser.uid).set(false);
    }, 2000);
  });
  
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Send message button
  sendButton.addEventListener('click', sendMessage);
  
  // Add channel button
  addChannelBtn.addEventListener('click', () => {
    const channelName = prompt('Enter new channel name:');
    if (channelName && channelName.trim()) {
      const newChannel = channelName.trim().toLowerCase().replace(/\s+/g, '-');
      database.ref('channels/' + newChannel).set({
        name: channelName.trim(),
        description: 'New channel',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
    }
  });
}

// Load user data from database
async function loadUserData() {
  const snapshot = await database.ref('users/' + currentUser.uid).once('value');
  const userData = snapshot.val();
  
  if (userData) {
    userName.textContent = userData.name;
    
    if (userData.avatar) {
      userAvatar.style.backgroundImage = `url(${userData.avatar})`;
      userAvatar.textContent = '';
    } else {
      userAvatar.style.backgroundImage = '';
      userAvatar.textContent = userData.name.charAt(0).toUpperCase();
    }
    
    initChat();
  } else {
    toggleAuthMode();
    showAuthModal();
  }
}

// Initialize chat functionality
function initChat() {
  app.style.display = 'flex';
  
  // Load channels first
  loadChannels();
  
  // Then load users and setup presence
  loadUsers();
  setupPresence();
  
  // Set default channel if not set
  if (!currentChannel) {
    currentChannel = 'general';
    switchChannel('general');
  }
}

// Load channels from database
function loadChannels() {
  database.ref('channels').on('value', snapshot => {
    channels = snapshot.val();
    
    // If no channels exist, create the general channel
    if (!channels) {
      database.ref('channels/general').set({
        name: 'General',
        description: 'General discussions',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
      channels = {'general': {name: 'General', description: 'General discussions'}};
    }
    
    renderChannels();
    
    // Set current channel to general if not set
    if (!currentChannel || !channels[currentChannel]) {
      currentChannel = 'general';
      switchChannel('general');
    }
  });
}

// Render channels list
function renderChannels() {
  const channelGroup = channelsList.querySelector('.channel-group');
  channelGroup.innerHTML = `
    <div class="channel-group-header">
      <span>Text Channels</span>
      <button id="add-channel">+</button>
    </div>
  `;
  
  // Add each channel to the list
  for (const [id, channel] of Object.entries(channels)) {
    const channelElement = document.createElement('div');
    channelElement.className = `channel ${id === currentChannel ? 'active' : ''}`;
    channelElement.innerHTML = `
      <span class="channel-icon">#</span>
      <span class="channel-name">${channel.name}</span>
    `;
    channelElement.addEventListener('click', () => switchChannel(id));
    channelGroup.appendChild(channelElement);
  }
  
  // Add event listener for new channel button
  document.getElementById('add-channel').addEventListener('click', () => {
    const channelName = prompt('Enter new channel name:');
    if (channelName && channelName.trim()) {
      const newChannelId = channelName.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Check if channel already exists
      if (channels[newChannelId]) {
        alert('Channel already exists!');
        return;
      }
      
      // Create new channel
      database.ref('channels/' + newChannelId).set({
        name: channelName.trim(),
        description: 'New channel',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      }).then(() => {
        // Switch to the new channel after creation
        switchChannel(newChannelId);
      });
    }
  });
}

// Switch to a different channel
function switchChannel(channelId) {
  currentChannel = channelId;
  const channel = channels[channelId];
  
  channelTitle.textContent = channel.name;
  channelDescription.textContent = channel.description;
  
  // Update active state in sidebar
  document.querySelectorAll('.channel').forEach(el => {
    el.classList.remove('active');
  });
  document.querySelectorAll('.channel').forEach(el => {
    if (el.querySelector('.channel-name').textContent === channel.name) {
      el.classList.add('active');
    }
  });
  
  loadMessages();
}

// Load messages for current channel
function loadMessages() {
  messagesContainer.innerHTML = '';
  
  database.ref('messages/' + currentChannel).orderByChild('timestamp').limitToLast(100).on('value', snapshot => {
    const messages = snapshot.val() || {};
    
    // Convert messages object to array and sort by timestamp
    const messagesArray = Object.entries(messages).map(([id, message]) => ({
      id,
      ...message
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    // Clear messages before adding new ones
    messagesContainer.innerHTML = '';
    
    // Add each message to the container
    messagesArray.forEach(message => {
      addMessage(
        message.authorId, 
        message.authorName, 
        message.content, 
        message.timestamp, 
        false, 
        message.avatar
      );
    });
    
    // Scroll to bottom
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  });
}

// Add a new message to the chat
function addMessage(authorId, authorName, content, timestamp, isNew = true, avatar = null) {
  const date = new Date(timestamp);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isNew ? 'fade-in' : ''}`;
  
  const avatarStyle = avatar ? `url(${avatar})` : 'none';
  const avatarFallback = avatar ? '' : authorName.charAt(0).toUpperCase();
  
  messageElement.innerHTML = `
    <div class="message-avatar" style="background-image: ${avatarStyle}">
      ${avatarFallback}
    </div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">${authorName}</span>
        <span class="message-time">${timeString}</span>
      </div>
      <div class="message-text">${content}</div>
      <div class="message-actions">
        <button>👍</button>
        <button>👎</button>
        <button>💬</button>
      </div>
    </div>
  `;
  
  messagesContainer.appendChild(messageElement);
  
  if (isNew) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    if (authorId !== currentUser.uid) {
      showNotification(`New message from ${authorName}`);
    }
  }
}

// Send a message
function sendMessage() {
  const content = messageInput.value.trim();
  if (!content) return;
  
  // Create message object
  const message = {
    content: content,
    authorId: currentUser.uid,
    authorName: userName.textContent,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    avatar: userAvatar.style.backgroundImage || null
  };
  
  // Push message to database
  database.ref('messages/' + currentChannel).push(message)
    .then(() => {
      // Clear input field
      messageInput.value = '';
      messageInput.style.height = 'auto';
      
      // Reset typing indicator
      isTyping = false;
      database.ref('typing/' + currentChannel + '/' + currentUser.uid).set(false);
    })
    .catch(error => {
      console.error("Error sending message:", error);
      showNotification("Failed to send message");
    });
}

// Load users and setup presence
function loadUsers() {
  database.ref('users').on('value', snapshot => {
    users = snapshot.val() || {};
    renderMembersList();
  });
}

// Setup presence tracking
function setupPresence() {
  const userStatusRef = database.ref('status/' + currentUser.uid);
  const userConnectionsRef = database.ref('.info/connected');
  
  userConnectionsRef.on('value', (snapshot) => {
    if (snapshot.val()) {
      const ref = userStatusRef.onDisconnect();
      ref.set({
        status: 'offline',
        lastChanged: firebase.database.ServerValue.TIMESTAMP
      }).then(() => {
        userStatusRef.set({
          status: 'online',
          lastChanged: firebase.database.ServerValue.TIMESTAMP
        });
      });
    }
  });
  
  // Listen for status changes
  database.ref('status').on('value', snapshot => {
    const statuses = snapshot.val() || {};
    let onlineUsers = 0;
    
    // Update user statuses
    for (const [userId, status] of Object.entries(statuses)) {
      if (users[userId]) {
        users[userId].status = status.status;
        if (status.status === 'online') onlineUsers++;
      }
    }
    
    // Update online count
    onlineCount.textContent = onlineUsers;
    
    // Re-render members list
    renderMembersList();
  });
  
  // Load initial users data if not loaded
  if (Object.keys(users).length === 0) {
    loadUsers();
  }
}
  
  // Listen for status changes
  database.ref('status').on('value', snapshot => {
    const statuses = snapshot.val() || {};
    let onlineUsers = 0;
    
    for (const [userId, status] of Object.entries(statuses)) {
      if (users[userId]) {
        users[userId].status = status.status;
        if (status.status === 'online') onlineUsers++;
      }
    }
    
    onlineCount.textContent = onlineUsers;
    renderMembersList();
  });
  
  // Listen for typing indicators
  database.ref('typing/' + currentChannel).on('value', snapshot => {
    typingUsers = snapshot.val() || {};
    const typingUserIds = Object.keys(typingUsers).filter(uid => typingUsers[uid] && uid !== currentUser.uid);
    
    if (typingUserIds.length > 0) {
      const names = typingUserIds.map(uid => users[uid]?.name || 'Someone');
      typingText.textContent = `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} typing...`;
      typingIndicator.style.display = 'flex';
    } else {
      typingIndicator.style.display = 'none';
    }
  });

// Render members list
function renderMembersList() {
  membersList.innerHTML = '';
  
  const sortedUsers = Object.values(users).sort((a, b) => {
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    return a.name.localeCompare(b.name);
  });
  
  sortedUsers.forEach(user => {
    const memberElement = document.createElement('div');
    memberElement.className = 'member';
    memberElement.innerHTML = `
      <div class="member-avatar" style="${user.avatar ? `background-image: url(${user.avatar})` : ''}">
        ${user.avatar ? '' : user.name.charAt(0).toUpperCase()}
        <div class="member-status ${user.status || 'offline'}"></div>
      </div>
      <div class="member-name">${user.name}</div>
    `;
    membersList.appendChild(memberElement);
  });
}

// Initialize the app
function initApp() {
  setupEventListeners();
  checkAuthState();
}

// Check authentication state
function checkAuthState() {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      loadUserData();
    } else {
      showAuthModal();
    }
  });
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);