import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { db, storage, auth } from '../firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, doc, getDoc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

import profileImg from '../assets/profile.jpg';
import send from '../assets/send.png';
import imageIcon from '../assets/image.png';
import emojiIcon from '../assets/emoji.png';
import './messages_page.css';

const MessagesPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]); 
  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState('');
  const [activeChatId, setActiveChatId] = useState(null); 
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);

  const fileInputRef = useRef(null);
  const scrollRef = useRef();

  const currentChatData = chats.find(c => c.id === activeChatId);

  // Helper to truncate long filenames but keep the extension visible
  const formatFileName = (name) => {
    if (!name || name.length <= 20) return name;
    
    const extension = name.split('.').pop();
    const baseName = name.substring(0, name.lastIndexOf('.'));
    
    // Returns: "LongFileNa...1234.pptx"
    return `${baseName.substring(0, 10)}...${baseName.slice(-4)}.${extension}`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user ? user : null);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Chat List
  useEffect(() => {
    if (!currentUser) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participantIds", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (d) => {
        const chatData = d.data();
        if (!chatData.isGroup) {
          const otherId = chatData.participantIds.find(id => id !== currentUser.uid);
          if (otherId) {
            const userRef = doc(db, "users", otherId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              return { 
                id: d.id, 
                ...chatData, 
                chatName: uData.firstName ? `${uData.firstName} ${uData.lastName}` : (uData.displayName || "User"),
                chatImage: uData.profilePictureUrl || uData.profilePic 
              };
            }
          }
        }
        return { id: d.id, ...chatData };
      });

      const resolvedChats = await Promise.all(chatPromises);
      setChats(resolvedChats);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Global Search
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setGlobalSearchResults([]);
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef, 
          where("firstName", ">=", searchQuery), 
          where("firstName", "<=", searchQuery + '\uf8ff'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== currentUser.uid) {
            results.push({ id: doc.id, ...doc.data() });
          }
        });
        setGlobalSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentUser]);

  const handleSelectUser = async (selectedUser) => {
    const existingChat = chats.find(c => c.participantIds?.includes(selectedUser.id));

    if (existingChat) {
      setActiveChatId(existingChat.id);
    } else {
      try {
        const newChatRef = await addDoc(collection(db, "chats"), {
          participantIds: [currentUser.uid, selectedUser.id],
          isGroup: false,
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        setActiveChatId(newChatRef.id);
      } catch (err) {
        console.error("Error creating chat:", err);
      }
    }
    setSearchQuery('');
  };

  // Fetch Messages
  useEffect(() => {
    if (!activeChatId || !currentUser) return;

    const messagesRef = collection(db, "chats", activeChatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [activeChatId, currentUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !activeChatId || !currentUser) return;

    try {
      setIsUploading(true);
      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      if (selectedFile) {
        const storageRef = ref(storage, `chat_attachments/${activeChatId}/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile);
        fileUrl = await getDownloadURL(storageRef);
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      }

      const msgData = {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
      };

      if (fileUrl) {
        msgData.fileUrl = fileUrl;
        msgData.fileName = fileName;
        msgData.fileType = fileType;
      }

      await addDoc(collection(db, "chats", activeChatId, "messages"), msgData);

      await updateDoc(doc(db, "chats", activeChatId), {
        lastMessage: newMessage.trim() || (fileType?.startsWith('image/') ? "Sent a Photo" : "Sent a File"),
        lastMessageAt: serverTimestamp()
      });

      setNewMessage('');  
      setSelectedFile(null);
      setShowEmojiPicker(false);
    } catch (err) {
      console.error("Send Failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  return (
    <div className="messages-page-container">
      <aside className="chat-sidebar">
        <div className="search-wrapper">
          <input 
            type="text" 
            placeholder="Search users..." 
            className="sidebar-search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="conversation-list">
          {searchQuery.length > 0 && globalSearchResults.length > 0 && (
            <div className="search-category">
                <p className="search-label">Global Results</p>
                {globalSearchResults.map(user => (
                    <div key={user.id} className="conversation-item search-result" onClick={() => handleSelectUser(user)}>
                        <img src={user.profilePictureUrl || profileImg} alt="User" className="img-profile-circle" />
                        <div className="convo-info">
                            <span className="user-display-name">{user.firstName} {user.lastName}</span>
                            <p className="last-message-preview">Start a new conversation</p>
                        </div>
                    </div>
                ))}
                <hr className="search-divider" />
            </div>
          )}

          {chats.filter(c => c.chatName?.toLowerCase().includes(searchQuery.toLowerCase())).map((chat) => ( 
            <div key={chat.id} className={`conversation-item ${activeChatId === chat.id ? 'selected' : ''}`} onClick={() => setActiveChatId(chat.id)}>
              <img src={chat.chatImage || profileImg} alt="User" className="img-profile-circle" />
              <div className="convo-info">
                <span className="user-display-name">{chat.chatName}</span>
                <p className="last-message-preview">{chat.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="chat-main">
        {activeChatId ? (
          <>
            <header className="chat-area-header">
              <div className="current-user-context">
                <img src={currentChatData?.chatImage || profileImg} alt="User" className="img-profile-circle" />
                <span className="user-display-name">{currentChatData?.chatName}</span>
              </div>
            </header>

            <div className="chat-history-container">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-wrapper ${msg.senderId === currentUser?.uid ? 'me' : 'them'}`}>
                  <div className="message-bubble">
                    {msg.fileUrl && (
                      <div className="file-content">
                        {msg.fileType?.startsWith('image/') ? (
                          <img src={msg.fileUrl} alt="Sent" className="chat-sent-img" onClick={() => window.open(msg.fileUrl, '_blank')} />
                        ) : (
                          <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="file-link">{formatFileName(msg.fileName)}</a>
                        )}
                      </div>
                    )}
                    {msg.text && <p className="message-text">{msg.text}</p>}
                    <span className="message-time">
                      {msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <footer className="chat-area-footer">
              <div className="footer-layout-wrapper">
                
                {/* File Preview Container */}
                {selectedFile && (
                  <div className="file-preview-bar">
                    <div className="preview-item">
                      <div className="file-icon-wrapper">
                        {selectedFile.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(selectedFile)} alt="preview" className="thumb-nail" />
                        ) : (
                          <span className="doc-icon">📄</span>
                        )}
                      </div>
                      <div className="file-details">
                        <span className="file-name">{formatFileName(selectedFile.name)}</span>
                      </div>
                      <button className="remove-file-btn" onClick={() => setSelectedFile(null)}>×</button>
                    </div>
                  </div>
                )}

                <div className="footer-controls">
                  <button type="button" className="external-footer-btn" onClick={() => fileInputRef.current.click()}>
                    <img src={imageIcon} alt="attach" className="footer-icon-asset" />
                  </button>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={(e) => setSelectedFile(e.target.files[0])} 
                  />

                  <form className="message-composition-box" onSubmit={handleSendMessage}>
                    <input 
                      type="text" 
                      placeholder="Aa" 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                      className="message-input-field" 
                    />
                    <div className="emoji-picker-container">
                      {showEmojiPicker && (
                        <div className="emoji-picker-wrapper">
                          <EmojiPicker onEmojiClick={onEmojiClick} theme="light" width={300} height={400} />
                        </div>
                      )}
                      <button type="button" className="internal-emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                        <img src={emojiIcon} alt="emoji" className="emoji-icon-asset" />
                      </button>
                    </div>
                  </form>

                  <button type="button" className="external-footer-btn" onClick={handleSendMessage} disabled={isUploading}>
                    <img src={send} alt="send" className="footer-icon-asset" style={{ opacity: isUploading ? 0.5 : 1 }} />
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="no-chat-selected"><p>Select a conversation or search for a user to start messaging</p></div>
        )}
      </main>
    </div>
  );
};

export default MessagesPage;