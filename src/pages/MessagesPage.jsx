import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import styles from '../components/MessagesStyles';

const MessagesPage = () => {
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Data States
  const [chats] = useState([
    { id: 1, name: "Juan De La Cruz", status: "Verified account" },
    { id: 2, name: "Maria Clara", status: "Verified account" },
    { id: 3, name: "Regil Kent", status: "Verified account" },
  ]);

  const [messagesByChat, setMessagesByChat] = useState({
    1: [{ id: 101, text: "Hello! I saw your aid request.", sender: "other" }],
    2: [],
    3: [],
  });

  // 2. UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetName, setTargetName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState(1);
  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const currentMessages = messagesByChat[activeChatId] || [];
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages]);

  // --- HANDLERS ---

  const handleVerifyAndStart = () => {
    if (!targetName) return;
    const existingUser = chats.find(c => c.name.toLowerCase() === targetName.toLowerCase());

    if (existingUser) {
      setActiveChatId(existingUser.id);
      closeModal();
    } else {
      setErrorMessage("Error: This user does not exist.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTargetName("");
    setErrorMessage("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile({
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type
      });
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() === "" && !attachedFile) return;

    const msg = {
      id: Date.now(),
      text: newMessage,
      sender: "me",
      file: attachedFile
    };

    setMessagesByChat({
      ...messagesByChat,
      [activeChatId]: [...currentMessages, msg]
    });

    setNewMessage("");
    setAttachedFile(null);
  };

  return (
    <div style={styles.pageWrapper}>
      <Navbar />
      <div style={styles.mainContent}>
        
        {/* SIDEBAR */}
        <div style={styles.sidebar}>
          <div style={styles.searchContainer}>
            <input 
              type="text" 
              placeholder="Search Messages" 
              style={styles.searchInput} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div style={styles.chatList}>
            {filteredChats.map(chat => (
              <div 
                key={chat.id} 
                style={{
                  ...styles.chatItem, 
                  backgroundColor: activeChatId === chat.id ? '#F0F0F0' : 'transparent'
                }}
                onClick={() => setActiveChatId(chat.id)}
              >
                <div style={styles.avatarSmall}></div>
                <div style={styles.chatInfo}>
                  <div style={styles.chatName}>{chat.name}</div>
                  <div style={styles.chatStatus}>{chat.status} ✓</div>
                </div>
              </div>
            ))}
          </div>

          <button style={styles.newChatBtn} onClick={() => setIsModalOpen(true)}>
            + New Message
          </button>
        </div>

        {/* CHAT WINDOW */}
        <div style={styles.chatWindow}>
          <div style={styles.chatHeader}>
            <div style={styles.avatarHeader}></div>
            <div style={{flex: 1}}>
              <div style={styles.headerName}>{activeChat.name}</div>
              <div style={styles.headerStatus}>{activeChat.status} ✓</div>
            </div>
          </div>

          <div style={styles.messageArea} ref={scrollRef}>
            {currentMessages.map((m) => (
              <div key={m.id} style={m.sender === 'me' ? styles.myMsgRow : styles.theirMsgRow}>
                {m.sender === 'other' && <div style={styles.avatarMsg}></div>}
                <div style={m.sender === 'me' ? styles.myBubble : styles.theirBubble}>
                  {m.file && m.file.type.startsWith('image/') && (
                    <img src={m.file.url} alt="attachment" style={styles.attachedImage} />
                  )}
                  {m.file && !m.file.type.startsWith('image/') && (
                    <div style={styles.fileAttachment}>📄 {m.file.name}</div>
                  )}
                  {m.text && <div>{m.text}</div>}
                </div>
                {m.sender === 'me' && <div style={styles.avatarMsg}></div>}
              </div>
            ))}
          </div>

          <div style={styles.inputWrapper}>
            {attachedFile && (
              <div style={styles.attachmentPreview}>
                <span>📎 {attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} style={styles.removeFileBtn}>✕</button>
              </div>
            )}
            <div style={styles.inputContainer}>
              <button style={styles.iconBtn} onClick={() => fileInputRef.current.click()}>📎</button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{display: 'none'}} 
              />
              <input 
                style={styles.messageInput} 
                placeholder="Write your message...." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button style={styles.sendButton} onClick={handleSendMessage}>➤</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            {errorMessage ? (
              <>
                <div style={styles.errorIcon}>⚠️</div>
                <h3 style={{ marginBottom: '15px', color: '#D32F2F' }}>Notice</h3>
                <p style={{ marginBottom: '25px', fontWeight: '500' }}>{errorMessage}</p>
                <button style={styles.confirmBtn} onClick={() => setErrorMessage("")}>Try Again</button>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: '15px' }}>Start New Conversation</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Enter the name of the verified user:</p>
                <input 
                  style={styles.modalInput}
                  type="text"
                  placeholder="e.g. Maria Clara"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyAndStart()}
                />
                <div style={styles.modalActions}>
                  <button style={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                  <button style={styles.confirmBtn} onClick={handleVerifyAndStart}>Search</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;