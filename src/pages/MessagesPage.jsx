import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import profileImg from '../assets/profile.jpg';
import settings from '../assets/settings.png';
import send from '../assets/send.png';
import image from '../assets/image.png';
import emojiIcon from '../assets/emoji.png';
import './messages_page.css';

const MessagesPage = () => {
  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState('');
  const [activeChatId, setActiveChatId] = useState(null); 
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // File Attachment States
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef();

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    const msgObj = {
      id: Date.now().toString(),
      text: newMessage,
      fileName: selectedFile ? selectedFile.name : null, // Store filename if exists
      sender: 'me', 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, msgObj]);
    setNewMessage('');
    setSelectedFile(null); // Clear file after sending
    setShowEmojiPicker(false); // Close picker after sending
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  // File Handling Logic
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="messages-page-container">
      {/* Attachment Modal */}
      {showFileModal && (
        <div className="file-modal-overlay" onClick={() => setShowFileModal(false)}>
          <div className="file-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Upload File</h3>
            <div className="file-drop-area" onClick={triggerFileSelect}>
              {selectedFile ? (
                <p className="file-name-display">Selected: <strong>{selectedFile.name}</strong></p>
              ) : (
                <p>Click to select a file or image</p>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => { setShowFileModal(false); setSelectedFile(null); }}>Cancel</button>
              <button className="confirm-btn" onClick={() => setShowFileModal(false)} disabled={!selectedFile}>Attach</button>
            </div>
          </div>
        </div>
      )}

      <aside className="chat-sidebar">
        <div className="search-wrapper">
          <input type="text" placeholder="Search Messages" className="sidebar-search" />
        </div>
        
        <div className="conversation-list">
          <div 
            className={`conversation-item ${activeChatId === 1 ? 'selected' : ''}`}
            onClick={() => setActiveChatId(1)}
          >
            <img src={profileImg} alt="User" className="img-profile-circle" />
            <div className="convo-info">
              <span className="user-display-name">Juan De La Cruz</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="chat-main">
        {activeChatId ? (
          <>
            <header className="chat-area-header">
              <div className="current-user-context">
                <img src={profileImg} alt="User" className="img-profile-circle" />
                <span className="user-display-name">Juan De La Cruz</span>
              </div>
              <button className="header-options-btn">
                <img src={settings} alt="settings" className="action-icon-img" />
              </button>
            </header>

            <div className="chat-history-container">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                  <img src={profileImg} alt="Sender" className="img-profile-small" />
                  <div className="message-bubble">
                    {msg.fileName && (
                      <div className="file-attachment-preview">
                        📎 {msg.fileName}
                      </div>
                    )}
                    <p className="message-text">{msg.text}</p>
                    <span className="message-time">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <footer className="chat-area-footer">
              <div className="footer-layout-wrapper">
                {/* Left Side: Attachment Button triggers Modal */}
                <button type="button" className="external-footer-btn" onClick={() => setShowFileModal(true)}>
                  <img src={image} alt="attach" className="footer-icon-asset" />
                </button>

                <form className="message-composition-box" onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    placeholder={selectedFile ? `File attached: ${selectedFile.name}` : "Write your message...."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="message-input-field"
                  />
                  
                  {/* Internal: Emoji Toggle Button */}
                  <div className="emoji-picker-container">
                    {showEmojiPicker && (
                      <div className="emoji-picker-wrapper">
                        <EmojiPicker 
                          onEmojiClick={onEmojiClick} 
                          autoFocusSearch={false}
                          theme="light"
                          width={300}
                          height={400}
                        />
                      </div>
                    )}
                    <button 
                      type="button" 
                      className="internal-emoji-btn" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <img src={emojiIcon} alt="emoji" className="emoji-icon-asset" />
                    </button>
                  </div>
                </form>

                {/* External Right Side: Send Button */}
                <button 
                    type="button" 
                    className="external-footer-btn" 
                    onClick={handleSendMessage}
                >
                  <img src={send} alt="send" className="footer-icon-asset" />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesPage;