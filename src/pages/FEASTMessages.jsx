import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../firebase';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, where, doc, getDoc, updateDoc, getDocs, limit, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { Paperclip, X, Send, Search, FileText, MoreVertical, Reply, Edit2, Trash2, File, Download, UserPlus, History, Camera, Check } from "lucide-react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import userProfile from "../assets/juan.png"; 
import "../components/FEASTMessages.css";

const FEASTMessages = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [drafts, setDrafts] = useState({});

  // NEW CHAT & GROUP MODAL STATES
  const [showNewConvoModal, setShowNewConvoModal] = useState(false);
  const [isConfiguringGroup, setIsConfiguringGroup] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState(null);

  // FILE & PREVIEW STATES
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); 

  // ACTION STATES
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); 
  const [isChatDeleteModalOpen, setIsChatDeleteModalOpen] = useState(false); 
  const [selectedChatForDelete, setSelectedChatForDelete] = useState(null);
  const [selectedMsgForDelete, setSelectedMsgForDelete] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);

  const messagesEndRef = useRef(null);

  const currentDraft = drafts[activeChatId] || { text: "", files: [], replyingTo: null, editingMessage: null };
  const updateCurrentDraft = (updates) => {
    setDrafts(prev => ({ ...prev, [activeChatId]: { ...currentDraft, ...updates } }));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({ uid: user.uid, fullName: `${userData.firstName} ${userData.lastName}`, ...userData });
        } else { setCurrentUser(user); }
      } else { setCurrentUser(null); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!showNewConvoModal) return;
    const fetchUsers = async () => {
      const q = query(collection(db, "users"), limit(100));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== currentUser?.uid);
      setAllUsers(usersList);
    };
    fetchUsers();
  }, [showNewConvoModal, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenuId && !event.target.closest('.menu-wrapper')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "chats"), 
      where("participantIds", "array-contains", currentUser.uid), 
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const chatList = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let name = data.groupName || "Group Chat";
        let img = data.groupPhoto || userProfile;
        let pNames = "";
        
        if (!data.isGroup) {
          const otherId = data.participantIds.find(id => id !== currentUser.uid);
          if (otherId) {
            const uSnap = await getDoc(doc(db, "users", otherId));
            if (uSnap.exists()) {
              const ud = uSnap.data();
              name = `${ud.firstName} ${ud.lastName}`;
              img = ud.profilePictureUrl || userProfile;
            }
          }
        } else {
          const pDocs = await Promise.all(data.participantIds.map(id => getDoc(doc(db, "users", id))));
          pNames = pDocs
            .filter(doc => doc.exists())
            .map(doc => doc.data().firstName)
            .join(", ");
        }
        return { id: d.id, ...data, chatName: name, chatImage: img, participantNames: pNames };
      }));
      setChats(chatList);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!activeChatId) return;
    const q = query(collection(db, "chats", activeChatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [activeChatId]);

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => 
      prev.find(u => u.id === user.id) 
        ? prev.filter(u => u.id !== user.id) 
        : [...prev, user]
    );
  };

  const resetGroupState = () => {
    setShowNewConvoModal(false);
    setIsConfiguringGroup(false);
    setSelectedUsers([]);
    setGroupName("");
    setGroupPhoto(null);
    setGroupPhotoPreview(null);
  };

  const startConversation = async () => {
    if (selectedUsers.length === 0) return;

    if (selectedUsers.length === 1) {
      const otherUser = selectedUsers[0];
      const existing = chats.find(c => !c.isGroup && c.participantIds.includes(otherUser.id));
      if (existing) {
        if (existing.hiddenBy?.includes(currentUser.uid)) {
          await updateDoc(doc(db, "chats", existing.id), { hiddenBy: arrayRemove(currentUser.uid) });
        }
        setActiveChatId(existing.id);
        resetGroupState();
        return;
      }
      
      const newChatRef = await addDoc(collection(db, "chats"), {
        participantIds: [currentUser.uid, otherUser.id],
        isGroup: false,
        lastMessage: "New conversation started",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        hiddenBy: []
      });
      setActiveChatId(newChatRef.id);
      resetGroupState();
    } else {
      setIsConfiguringGroup(true);
    }
  };

  const handleGroupPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupPhoto(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim()) return alert("Please name your group.");
    try {
      setUploading(true);
      let photoUrl = "";
      if (groupPhoto) {
        const storageRef = ref(storage, `groupPhotos/${Date.now()}_${groupPhoto.name}`);
        const snap = await uploadBytes(storageRef, groupPhoto);
        photoUrl = await getDownloadURL(snap.ref);
      }

      const newChatRef = await addDoc(collection(db, "chats"), {
        participantIds: [currentUser.uid, ...selectedUsers.map(u => u.id)],
        isGroup: true,
        groupName: groupName.trim(),
        groupPhoto: photoUrl,
        lastMessage: "Group chat created",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        hiddenBy: []
      });

      setActiveChatId(newChatRef.id);
      resetGroupState();
    } catch (err) { console.error(err); } finally { setUploading(false); }
  };

  const handleSelectChat = async (chat) => {
    setActiveChatId(chat.id);
    if (chat.hiddenBy && chat.hiddenBy.includes(currentUser.uid)) {
      await updateDoc(doc(db, "chats", chat.id), {
        hiddenBy: arrayRemove(currentUser.uid)
      });
    }
  };

  const promptDeleteChat = (e, chat) => {
    e.stopPropagation();
    setSelectedChatForDelete(chat);
    setIsChatDeleteModalOpen(true);
  };

  const handleConfirmDeleteChat = async () => {
    if (!selectedChatForDelete) return;
    try {
      await updateDoc(doc(db, "chats", selectedChatForDelete.id), {
        hiddenBy: arrayUnion(currentUser.uid)
      });
      if (activeChatId === selectedChatForDelete.id) setActiveChatId(null);
      setIsChatDeleteModalOpen(false);
      setSelectedChatForDelete(null);
    } catch (err) { console.error("Failed to delete chat:", err); }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    const timer = setTimeout(() => { scrollToBottom(); }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      type: file.type
    }));
    updateCurrentDraft({ files: [...currentDraft.files, ...newFiles] });
  };

  const removeFile = (id) => {
    updateCurrentDraft({ files: currentDraft.files.filter(f => f.id !== id) });
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!currentDraft.text.trim() && currentDraft.files.length === 0) return;

    try {
      setUploading(true);
      const myName = currentUser?.fullName || "User";

      if (currentDraft.editingMessage) {
        await updateDoc(doc(db, "chats", activeChatId, "messages", currentDraft.editingMessage.id), { 
          editHistory: arrayUnion({ text: currentDraft.editingMessage.text, editedAt: new Date().toISOString() }),
          text: currentDraft.text.trim(),
          isEdited: true 
        });
      } else {
        const fileUploadPromises = currentDraft.files.map(async (fObj) => {
          const storageRef = ref(storage, `messages/${activeChatId}/${Date.now()}_${fObj.name}`);
          const snap = await uploadBytes(storageRef, fObj.file);
          const url = await getDownloadURL(snap.ref);
          return { url, name: fObj.name, type: fObj.type.startsWith("image/") ? "image" : "file" };
        });

        const uploadedFiles = await Promise.all(fileUploadPromises);

        await addDoc(collection(db, "chats", activeChatId, "messages"), {
          text: currentDraft.text,
          senderId: currentUser.uid,
          senderName: myName,
          senderPhoto: currentUser.profilePictureUrl || "", 
          createdAt: serverTimestamp(),
          attachments: uploadedFiles, 
          replyTo: currentDraft.replyingTo ? { id: currentDraft.replyingTo.id, text: currentDraft.replyingTo.text, sender: currentDraft.replyingTo.senderName } : null,
          editHistory: [],
          isEdited: false
        });

        await updateDoc(doc(db, "chats", activeChatId), { 
          lastMessage: uploadedFiles.length > 0 ? `Sent ${uploadedFiles.length} file(s)` : currentDraft.text, 
          lastMessageAt: serverTimestamp(),
          hiddenBy: [] 
        });
      }

      setDrafts(prev => ({
        ...prev,
        [activeChatId]: { text: "", files: [], replyingTo: null, editingMessage: null }
      }));
    } catch (err) { console.error(err); } finally { setUploading(false); }
  };

  const openDeleteConfirmation = (msg) => {
    setSelectedMsgForDelete(msg);
    setIsDeleteModalOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMsgForDelete) return;
    try {
      if (selectedMsgForDelete.attachments) {
        const deletePromises = selectedMsgForDelete.attachments.map(file => deleteObject(ref(storage, file.url)).catch(() => {}));
        await Promise.all(deletePromises);
      }
      await updateDoc(doc(db, "chats", activeChatId, "messages", selectedMsgForDelete.id), { 
        text: "deleted a message", isDeleted: true, attachments: null, editHistory: [] 
      });
      setIsDeleteModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  const activeChatData = chats.find(c => c.id === activeChatId);

  return (
    <div className="messages-page-wrapper">
      <Header />
      <div className="messages-content-area">
        <div className="feast-messages-root">
          <aside className="chat-sidebar-main">
            <div className="sidebar-header">
              <h3>Messages</h3>
              <div className="chat-search-container">
                <Search size={16} />
                <input type="text" placeholder="Search chats..." value={chatSearchTerm} onChange={(e) => setChatSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="conversation-listing">
              {chats.filter(c => {
                const isMatch = c.chatName.toLowerCase().includes(chatSearchTerm.toLowerCase());
                const isHidden = c.hiddenBy && c.hiddenBy.includes(currentUser?.uid);
                return chatSearchTerm.trim() === "" ? !isHidden : isMatch;
              }).map(chat => (
                <div key={chat.id} className={`conversation-card ${activeChatId === chat.id ? 'active' : ''}`} onClick={() => handleSelectChat(chat)}>
                  <img src={chat.chatImage} className="chat-image-circle" alt="" />
                  <div className="card-details">
                    <span className="user-name-card">{chat.chatName}</span>
                    <p className="card-preview">{chat.lastMessage}</p>
                  </div>
                  <button className="remove-chat-btn" title="Delete Chat" onClick={(e) => promptDeleteChat(e, chat)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="sidebar-footer">
              <button className="auth-button" onClick={() => setShowNewConvoModal(true)}>+ New Chat</button>
            </div>
          </aside>

          <main className="chat-area-main">
            {activeChatId ? (
              <>
                <header className="chat-context-header">
                  <div className="header-info">
                    <img src={activeChatData?.chatImage} alt="" />
                    <div className="header-text-info">
                        <span className="header-chat-name">{activeChatData?.chatName}</span>
                        {activeChatData?.isGroup && <p className="participant-names-list">{activeChatData?.participantNames}</p>}
                    </div>
                  </div>
                </header>
                
                <div className="chat-history-container">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`message-group ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`}>
                      
                      <span className="sender-name-label">
                        {msg.senderId === currentUser.uid ? "You" : msg.senderName}
                      </span>

                      <div className="message-with-avatar">
                        {!msg.isDeleted && (
                          <img src={msg.senderPhoto || userProfile} className="sender-avatar-small" alt="" />
                        )}

                        <div className="message-wrapper">
                          <div className={`message-bubble ${msg.isDeleted ? 'deleted-style' : ''}`}>
                            {msg.replyTo && !msg.isDeleted && (
                              <div className="reply-quote-box">
                                <span className="reply-user">@{msg.replyTo.sender}</span>
                                <p className="reply-text-preview" style={{ whiteSpace: 'pre-wrap' }}>{msg.replyTo.text}</p>
                              </div>
                            )}
                            {msg.isDeleted ? (
                              <span className="deleted-info">Message deleted</span>
                            ) : (
                              <>
                                {msg.attachments?.map((file, idx) => (
                                  <div key={idx} className="msg-attachment-item">
                                    {file.type === "image" ? <img src={file.url} className="msg-image clickable" alt="" onClick={() => setPreviewFile(file)} /> : 
                                    <div className="msg-file-link clickable" onClick={() => setPreviewFile(file)}><FileText size={16}/> <span>{file.name}</span></div>}
                                  </div>
                                ))}
                                <div className="text-content-wrapper">
                                  <p className="actual-msg-text" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                  {msg.isEdited && <span className="edited-label" onClick={() => setViewingHistory(msg)}>(edited)</span>}
                                </div>
                              </>
                            )}
                          </div>
                          {!msg.isDeleted && (
                            <div className="message-actions-container">
                              <button className="msg-action-btn" onClick={() => updateCurrentDraft({ replyingTo: msg })}><Reply size={18}/></button>
                              {msg.senderId === currentUser.uid && (
                                <div className="menu-wrapper">
                                  <button className="msg-action-btn" onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}><MoreVertical size={18}/></button>
                                  {activeMenuId === msg.id && (
                                    <div className="action-dropdown-menu">
                                      <button onClick={() => { updateCurrentDraft({ editingMessage: msg, text: msg.text }); setActiveMenuId(null); }}><Edit2 size={14}/> Edit</button>
                                      <button className="delete-option" onClick={() => openDeleteConfirmation(msg)}><Trash2 size={14}/> Delete</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="message-time-under">{formatTime(msg.createdAt)}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSendMessage}>
                  {currentDraft.files.length > 0 && (
                    <div className="multi-preview-bar">
                      {currentDraft.files.map(f => (
                        <div key={f.id} className="preview-chip">
                          {f.preview ? <img src={f.preview} alt="" /> : <File size={16}/>}
                          <span className="file-name-truncate">{f.name}</span>
                          <X size={14} className="remove-chip" onClick={() => removeFile(f.id)}/>
                        </div>
                      ))}
                    </div>
                  )}
                  {currentDraft.replyingTo && (
                    <div className="input-context-bar">
                      <div className="reply-preview-content">
                        <span>Replying to <strong>{currentDraft.replyingTo.senderName}</strong></span>
                        <p className="reply-text-snippet" style={{ whiteSpace: 'pre-wrap' }}>{currentDraft.replyingTo.text}</p>
                      </div>
                      <X size={14} className="pointer" onClick={() => updateCurrentDraft({ replyingTo: null })}/>
                    </div>
                  )}
                  {currentDraft.editingMessage && <div className="input-context-bar editing">Editing... <X size={14} className="pointer" onClick={() => updateCurrentDraft({ editingMessage: null, text: "" })}/></div>}
                  
                  <div className="input-row" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '10px' }}>
                    <label htmlFor="file-up" style={{ marginBottom: '8px', cursor: 'pointer' }}>
                      <Paperclip size={20} className="icon-btn"/>
                    </label>
                    <input id="file-up" type="file" multiple style={{display: 'none'}} onChange={handleFileChange} />
                    
                    <textarea 
                      className="main-type-box" 
                      placeholder="Write message..." 
                      style={{ 
                        whiteSpace: 'pre-wrap', 
                        flex: 1, 
                        minHeight: '40px', 
                        maxHeight: '150px', 
                        resize: 'none',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                      value={currentDraft.text} 
                      onChange={(e) => updateCurrentDraft({ text: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      rows="1"
                    />
                    
                    <button 
                      type="submit" 
                      className="send-btn" 
                      disabled={uploading} 
                      style={{ marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Send size={20} color={currentDraft.text.trim() || currentDraft.files.length > 0 ? "#1b5e20" : "#ccc"}/>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="empty-chat-view"><div className="centered-empty-content"><Search size={80}/><p>Select a user to chat</p></div></div>
            )}
          </main>
        </div>
      </div>

      {isChatDeleteModalOpen && (
        <div className="feast-modal-overlay">
          <div className="message-modal-container confirmation">
            <h3>Delete Conversation?</h3>
            <p>Are you sure you want to delete your copy of this chat? This won't delete the chat for the other person.</p>
            <div className="modal-actions-row">
              <button className="cancel-btn" onClick={() => setIsChatDeleteModalOpen(false)}>Cancel</button>
              <button className="auth-button delete" onClick={handleConfirmDeleteChat}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {viewingHistory && (
        <div className="feast-modal-overlay">
          <div className="message-modal-container history-modal">
            <div className="modal-header">
              <div className="title-with-icon"><History size={20} /><h3>Edit History</h3></div>
              <X className="pointer" onClick={() => setViewingHistory(null)} />
            </div>
            <div className="history-list">
              <div className="history-item current"><span className="history-tag">Current Version</span><p style={{ whiteSpace: 'pre-wrap' }}>{viewingHistory.text}</p></div>
              {[...(viewingHistory.editHistory || [])].reverse().map((hist, i) => (
                <div key={i} className="history-item">
                  <span className="history-time">Edited on {formatTime(hist.editedAt)}</span>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{hist.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showNewConvoModal && (
        <div className="feast-modal-overlay">
          <div className="message-modal-container user-select-modal">
            <div className="modal-header">
              <h3>{isConfiguringGroup ? "Group Details" : "New Conversation"}</h3>
              <X className="pointer" onClick={resetGroupState} />
            </div>

            {!isConfiguringGroup ? (
              <>
                <div className="modal-search">
                  <Search size={16} />
                  <input type="text" placeholder="Search for people..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} />
                </div>
                <div className="user-list-results">
                  {allUsers.filter(u => (`${u.firstName} ${u.lastName}`).toLowerCase().includes(userSearchTerm.toLowerCase())).map(user => (
                    <div key={user.id} className={`user-select-row ${selectedUsers.find(u => u.id === user.id) ? 'selected-user' : ''}`} onClick={() => toggleUserSelection(user)}>
                      <img src={user.profilePictureUrl || userProfile} alt="" />
                      <div className="user-info-text">
                        <span className="user-fullname">{user.firstName} {user.lastName}</span>
                        <span className="user-handle">@{user.firstName?.toLowerCase()}</span>
                      </div>
                      {selectedUsers.find(u => u.id === user.id) ? <Check size={18} color="#28a745" /> : <UserPlus size={18} color="#999" />}
                    </div>
                  ))}
                </div>
                <div className="modal-footer-action">
                    <button className="auth-button" disabled={selectedUsers.length === 0} onClick={startConversation}>
                        {selectedUsers.length > 1 ? `Create Group (${selectedUsers.length})` : "Chat Now"}
                    </button>
                </div>
              </>
            ) : (
              <div className="group-config-container">
                 <div className="group-photo-upload" onClick={() => document.getElementById('group-photo-input').click()}>
                    {groupPhotoPreview ? <img src={groupPhotoPreview} alt="Preview" className="preview-circle" /> : <div className="photo-placeholder"><Camera size={30} /></div>}
                    <span style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>{groupPhoto ? "Change Photo" : "Upload Group Photo"}</span>
                    <input id="group-photo-input" type="file" hidden accept="image/*" onChange={handleGroupPhotoChange} />
                 </div>
                 <input 
                    type="text" 
                    className="group-name-input" 
                    placeholder="Enter Group Chat Name" 
                    value={groupName} 
                    onChange={(e) => setGroupName(e.target.value)} 
                 />
                 <div className="modal-actions-row">
                    <button className="cancel-btn" onClick={() => setIsConfiguringGroup(false)}>Back</button>
                    <button className="auth-button" onClick={handleCreateGroupChat} disabled={uploading || !groupName.trim()}>
                        {uploading ? "Creating..." : "Start Group Chat"}
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {previewFile && (
        <div className="lightbox-overlay" onClick={() => setPreviewFile(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-lightbox" onClick={() => setPreviewFile(null)}><X size={30}/></button>
            {previewFile.type === "image" ? <img src={previewFile.url} alt="" /> : <div className="file-preview-card"><FileText size={50} color="#1b5e20" /><p>{previewFile.name}</p></div>}
            <a href={previewFile.url} download={previewFile.name} target="_blank" rel="noreferrer" className="auth-button download-link"><Download size={18} /> Download</a>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="feast-modal-overlay">
          <div className="message-modal-container confirmation">
            <h3>Delete Message?</h3><p>This is permanent and will delete the message for everyone.</p>
            <div className="modal-actions-row"><button className="cancel-btn" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button><button className="auth-button delete" onClick={handleConfirmDelete}>Delete</button></div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default FEASTMessages;