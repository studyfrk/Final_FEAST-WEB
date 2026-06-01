/* React & Firebase Imports */
import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../firebase';
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, where, doc, getDoc, updateDoc, getDocs, limit,
  arrayUnion, arrayRemove, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Paperclip, X, Send, Search, FileText, MoreVertical, Reply,
  Edit2, Trash2, File, Download, UserPlus, History, Camera,
  Check, Smile, Users, ChevronRight, LogOut, Flag, Info,
  AlertTriangle, ArrowLeft, Shield, UserMinus, Settings, Plus
} from "lucide-react";
import EmojiPicker from 'emoji-picker-react';

/* Asset Imports */
import userProfile from "../assets/juan.png";

/* Component Imports */
import Footer from "../components/Footer.jsx";
import TermsConditionsModal from "../components/TermsConditionsModal.jsx";

/* Style Imports */
import styles from "../components/feast_messages.module.css";

// Input Sanitization Helper
const sanitizeInput = (val) => {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').trim();
};

// ─────────────────────────────────────────────
// GROUP INFO PANEL
// ─────────────────────────────────────────────
const GroupInfoPanel = ({ chatData, chatId, currentUser, allUsers, onClose, onChatUpdated }) => {
  const [view, setView] = useState('main'); // 'main' | 'editDetails' | 'inviteMembers' | 'reportMember' | 'kickMember'
  const [memberDetails, setMemberDetails] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Edit group fields
  const [editName, setEditName] = useState(chatData?.groupName || '');
  const [editDescription, setEditDescription] = useState(chatData?.description || '');
  const [editPhoto, setEditPhoto] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(chatData?.groupPhoto || null);
  const [showTerms, setShowTerms] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  // Invite members
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteSelected, setInviteSelected] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);

  // Report member
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportImage, setReportImage] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Kick member
  const [kickTarget, setKickTarget] = useState(null);

  // Leave / Remove confirm
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showTransferLeader, setShowTransferLeader] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);
  const [selectedToRemove, setSelectedToRemove] = useState([]);

  const isAdmin = (chatData?.adminIds || []).includes(currentUser?.uid) || chatData?.creatorId === currentUser?.uid;
  const isCreator = chatData?.creatorId === currentUser?.uid;

  useEffect(() => {
    if (!chatData?.participantIds) return;
    const fetchMembers = async () => {
      setLoadingMembers(true);
      const details = await Promise.all(
        chatData.participantIds.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid));
          return snap.exists() ? { id: uid, ...snap.data() } : { id: uid };
        })
      );
      setMemberDetails(details);
      setLoadingMembers(false);
    };
    fetchMembers();
  }, [chatData?.participantIds]);

  const handleSaveGroupDetails = async () => {
    const sanitizedName = sanitizeInput(editName);
    const sanitizedDescription = sanitizeInput(editDescription);
    if (!sanitizedName) return;
    setSavingEdit(true);
    try {
      let photoUrl = chatData?.groupPhoto || '';
      if (editPhoto) {
        const storageRef = ref(storage, `group_images/${chatId}/${Date.now()}_${editPhoto.name}`);
        const snap = await uploadBytes(storageRef, editPhoto);
        photoUrl = await getDownloadURL(snap.ref);
      }
      await updateDoc(doc(db, 'chats', chatId), {
        groupName: sanitizedName,
        description: sanitizedDescription,
        groupPhoto: photoUrl,
        groupImageUrl: photoUrl
      });
      if (onChatUpdated) onChatUpdated();
      setView('main');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const sendSystemMessage = async (text) => {
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'system',
        text,
        createdAt: serverTimestamp(),
        readBy: []
      });
    } catch (err) {
      console.error('Failed to send system message:', err);
    }
  };

  const handleAddMembers = async () => {
    if (inviteSelected.length === 0) return;
    setAddingMembers(true);
    try {
      const newIds = inviteSelected.map(u => u.id);
      await updateDoc(doc(db, 'chats', chatId), {
        participantIds: arrayUnion(...newIds)
      });
      const names = inviteSelected.map(u =>
        u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.displayName || 'Someone'
      ).join(', ');
      await sendSystemMessage(`${names} joined the group.`);
      if (onChatUpdated) onChatUpdated();
      setInviteSelected([]);
      setView('main');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = async (member) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        participantIds: arrayRemove(member.id),
        adminIds: arrayRemove(member.id)
      });
      const name = member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : member.displayName || 'A member';
      await sendSystemMessage(`${name} was removed from the group.`);
      if (onChatUpdated) onChatUpdated();
      setRemovingMember('toggle');
    } catch (err) {
      console.error(err);
      setRemovingMember('toggle');
    }
  };

  const handleToggleRemoveMode = () => {
    setRemovingMember(prev => {
      if (prev === 'toggle' || prev === 'confirm_bulk') {
        setSelectedToRemove([]);
        return null;
      } else {
        return 'toggle';
      }
    });
  };

  const handleBulkRemoveMembers = async () => {
    if (selectedToRemove.length === 0) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        participantIds: arrayRemove(...selectedToRemove),
        adminIds: arrayRemove(...selectedToRemove)
      });
      const removedNames = memberDetails
        .filter(m => selectedToRemove.includes(m.id))
        .map(m => m.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : m.displayName || 'A member')
        .join(', ');
      await sendSystemMessage(`${removedNames} ${selectedToRemove.length > 1 ? 'were' : 'was'} removed from the group.`);
      if (onChatUpdated) onChatUpdated();
      setSelectedToRemove([]);
      setRemovingMember(null);
    } catch (err) {
      console.error(err);
      setRemovingMember('toggle');
    }
  };

  const handleLeaveGroup = async () => {
    const otherMembers = memberDetails.filter(m => m.id !== currentUser.uid);

    if (isCreator && otherMembers.length > 0) {
      setConfirmLeave(false);
      setShowTransferLeader(true);
      return;
    }

    try {
      const myName = currentUser?.fullName || currentUser?.displayName || 'Someone';
      await sendSystemMessage(`${myName} left the group.`);
      await updateDoc(doc(db, 'chats', chatId), {
        participantIds: arrayRemove(currentUser.uid),
        adminIds: arrayRemove(currentUser.uid)
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferAndLeave = async () => {
    if (!transferTarget) return setAlertMessage('Please select a new leader.');
    try {
      const myName = currentUser?.fullName || currentUser?.displayName || 'Someone';
      const newLeaderName = transferTarget.firstName
        ? `${transferTarget.firstName} ${transferTarget.lastName || ''}`.trim()
        : transferTarget.displayName || 'Someone';
      await updateDoc(doc(db, 'chats', chatId), {
        creatorId: transferTarget.id,
        adminIds: arrayUnion(transferTarget.id)
      });
      await sendSystemMessage(`${myName} left the group. ${newLeaderName} is the new leader.`);
      await updateDoc(doc(db, 'chats', chatId), {
        participantIds: arrayRemove(currentUser.uid),
        adminIds: arrayRemove(currentUser.uid)
      });
      onClose();
    } catch (err) {
      console.error(err);
      setAlertMessage('Failed to transfer leadership. Please try again.');
    }
  };

  const handleReportMember = async () => {
    const sanitizedReason = sanitizeInput(reportReason);
    if (!reportTarget || !sanitizedReason) return setAlertMessage('Please fill in all fields.');
    if (!reportImage) return setAlertMessage('Please attach image proof.');
    setSubmittingReport(true);
    try {
      const storageRef = ref(storage, `reports_proof/${Date.now()}_${reportImage.name}`);
      const uploadResult = await uploadBytes(storageRef, reportImage);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        reporterName: currentUser.fullName || currentUser.email,
        reportedUserId: reportTarget.id,
        reportedUserEmail: reportTarget.email || '',
        reason: sanitizedReason,
        proofImageUrl: downloadURL,
        status: 'Pending',
        createdAt: serverTimestamp(),
        context: `Group Chat: ${chatData?.groupName || chatId}`
      });
      setAlertMessage('Report submitted successfully.');
      setReportTarget(null);
      setReportReason('');
      setReportImage(null);
      setView('main');
    } catch (err) {
      console.error(err);
      setAlertMessage('Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleKickMember = async () => {
    if (!kickTarget) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        participantIds: arrayRemove(kickTarget.id),
        adminIds: arrayRemove(kickTarget.id)
      });

      if (chatData.linkedEventId) {
        await updateDoc(doc(db, 'charity_events', chatData.linkedEventId), {
          anticipatedParticipants: arrayRemove(kickTarget.id)
        });
      }

      const kickedName = kickTarget.firstName
        ? `${kickTarget.firstName} ${kickTarget.lastName || ''}`.trim()
        : kickTarget.displayName || 'A member';
      await sendSystemMessage(`${kickedName} was kicked from the group.`);

      if (onChatUpdated) onChatUpdated();
      setKickTarget(null);
      setView('main');
    } catch (err) {
      console.error("Error kicking member:", err);
      setAlertMessage("Failed to kick member.");
    }
  };

  const availableToInvite = allUsers.filter(u =>
    !(chatData?.participantIds || []).includes(u.id) &&
    (`${u.firstName} ${u.lastName}`.toLowerCase().includes(inviteSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(inviteSearch.toLowerCase()))
  );

  const memberCount = chatData?.participantIds?.length || 0;

  return (
    <div className={styles.groupInfoPanel}>
      {/* ── MAIN VIEW ── */}
      {view === 'main' && (
        <>
          <div className={styles.groupInfoHeader}>
            <button className={styles.panelCloseBtn} onClick={onClose}><X size={18} /></button>
            <h3 className={styles.groupInfoTitle}>Group Info</h3>
          </div>

          <div className={styles.groupHeroSection}>
            <div className={styles.groupAvatarWrap}>
              <img
                src={chatData?.groupPhoto || userProfile}
                alt={chatData?.groupName}
                className={styles.groupAvatarLarge}
                onError={e => { e.target.src = userProfile; }}
              />
            </div>
            <h2 className={styles.groupHeroName}>{chatData?.groupName || 'Group Chat'}</h2>
            <p className={styles.groupMemberCount}>{memberCount} Member{memberCount !== 1 ? 's' : ''}</p>
            {chatData?.description && (
              <p className={styles.groupDescription}>{chatData.description}</p>
            )}
          </div>

          {isAdmin && (
            <div className={styles.groupActionGrid}>
              <button className={styles.groupActionBtn} onClick={() => setView('inviteMembers')}>
                <div className={styles.groupActionIcon}><UserPlus size={18} /></div>
                <span>Invite</span>
              </button>
              <button className={styles.groupActionBtn} onClick={() => setView('editDetails')}>
                <div className={styles.groupActionIcon}><Settings size={18} /></div>
                <span>Edit Info</span>
              </button>
            </div>
          )}

          <div className={styles.groupMembersSection}>
            <div className={styles.groupMembersHeader}>
              <span className={styles.groupMembersLabel}><Users size={14} /> All Members</span>
              <div className={styles.removeActionsWrapper}>
                {(removingMember === 'toggle' || removingMember === 'confirm_bulk') && selectedToRemove.length > 0 && (
                  <button 
                    className={styles.bulkRemoveBtn} 
                    onClick={() => setRemovingMember('confirm_bulk')}
                  >
                    Remove ({selectedToRemove.length})
                  </button>
                )}
                {isAdmin && memberDetails.length > 1 && (
                  <button 
                    className={`${styles.removeToggleBtn} ${(removingMember === 'toggle' || removingMember === 'confirm_bulk') ? styles.activeToggle : ''}`} 
                    onClick={handleToggleRemoveMode}
                  >
                    <UserMinus size={14} /> {(removingMember === 'toggle' || removingMember === 'confirm_bulk') ? 'Done' : 'Remove'}
                  </button>
                )}
              </div>
            </div>

            {loadingMembers ? (
              <div className={styles.memberLoadingRow}><div className={styles.loadingDots}><span /><span /><span /></div></div>
            ) : (
              memberDetails.map(member => {
                const name = member.firstName
                  ? `${member.firstName} ${member.lastName || ''}`.trim()
                  : member.displayName || 'User';
                const isLeader = chatData?.creatorId === member.id;
                const isCoAdmin = (chatData?.adminIds || []).includes(member.id) && !isLeader;
                const isSelf = member.id === currentUser?.uid;

                return (
                  <div key={member.id} className={styles.memberRow}>
                    <img
                      src={member.profilePictureUrl || userProfile}
                      alt={name}
                      className={styles.memberAvatar}
                      onError={e => { e.target.src = userProfile; }}
                    />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>
                        {name} {isSelf && <span className={styles.youBadge}>You</span>}
                      </span>
                      {isLeader && <span className={styles.leaderBadge}>Leader</span>}
                      {isCoAdmin && <span className={styles.coBadge}>Co-Admin</span>}
                    </div>
                    <div className={styles.memberActions}>
                      {!isSelf && removingMember !== 'toggle' && removingMember !== 'confirm_bulk' && (
                        <button
                          className={styles.reportMemberBtn}
                          title="Report Member"
                          onClick={() => { setReportTarget(member); setView('reportMember'); }}
                        >
                          <Flag size={14} />
                        </button>
                      )}
                      {isCreator && !isSelf && removingMember !== 'toggle' && removingMember !== 'confirm_bulk' && (
                        <button
                          className={styles.reportMemberBtn}
                          title="Kick Member"
                          onClick={() => { setKickTarget(member); setView('kickMember'); }}
                          style={{ backgroundColor: '#fee2e2', color: '#ef4444', marginLeft: '8px' }}
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                      {isAdmin && !isSelf && !isLeader && (removingMember === 'toggle' || removingMember === 'confirm_bulk') && (
                        <input
                          type="checkbox"
                          className={styles.removeMemberCheckbox}
                          checked={selectedToRemove.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedToRemove(prev => [...prev, member.id]);
                            } else {
                              setSelectedToRemove(prev => prev.filter(id => id !== member.id));
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.groupDangerZone}>
            <button className={styles.leaveGroupBtn} onClick={() => setConfirmLeave(true)}>
              <LogOut size={15} /> Leave Group
            </button>
          </div>
        </>
      )}

      {/* ── EDIT DETAILS VIEW ── */}
      {view === 'editDetails' && (
        <>
          <div className={styles.groupInfoHeader}>
            <button className={styles.panelCloseBtn} onClick={() => setView('main')}><ArrowLeft size={18} /></button>
            <h3 className={styles.groupInfoTitle}>Edit Group Details</h3>
          </div>
          <div className={styles.editGroupBody}>
            <div
              className={styles.editGroupPhotoWrap}
              onClick={() => document.getElementById('edit-group-photo').click()}
            >
              <img
                src={editPhotoPreview || userProfile}
                alt="Group"
                className={styles.editGroupPhoto}
                onError={e => { e.target.src = userProfile; }}
              />
              <div className={styles.editPhotoOverlay}><Camera size={18} /></div>
              <p className={styles.changePhotoLabel}>Change Group Photo</p>
              <input id="edit-group-photo" type="file" hidden accept="image/*"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const sizeInMB = file.size / (1024 * 1024);
                    if (sizeInMB > 5) {
                      setAlertMessage(`${file.name} exceeds the 5 MB limit for images.`);
                      return;
                    }
                    setEditPhoto(file);
                    setEditPhotoPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>

            <div className={styles.editFieldGroup}>
              <label className={styles.editFieldLabel}>Group Name *</label>
              <input
                className={styles.editFieldInput}
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Group Chat"
              />
            </div>

            <div className={styles.editFieldGroup}>
              <label className={styles.editFieldLabel}>Group Description (Optional)</label>
              <textarea
                className={styles.editFieldTextarea}
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Write a brief description (optional)..."
                rows={3}
              />
            </div>

            <div className={styles.editGroupActions}>
              <button className={styles.cancelActionBtn} onClick={() => setView('main')}>Cancel</button>
              <button
                className={styles.confirmActionBtn}
                onClick={handleSaveGroupDetails}
                disabled={savingEdit || !editName.trim()}
              >
                {savingEdit ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
          {showTerms && <TermsConditionsModal onClose={() => setShowTerms(false)} />}
        </>
      )}

      {/* ── INVITE MEMBERS VIEW ── */}
      {view === 'inviteMembers' && (
        <>
          <div className={styles.groupInfoHeader}>
            <button className={styles.panelCloseBtn} onClick={() => setView('main')}><ArrowLeft size={18} /></button>
            <h3 className={styles.groupInfoTitle}>Invite Members</h3>
          </div>
          <div className={styles.inviteBody}>
            <p className={styles.inviteSubtitle}>Search and add new members to this group chat.</p>
            <p className={styles.inviteCount}>{availableToInvite.length} users available</p>

            <div className={styles.inviteSearchBar}>
              <Search size={14} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={inviteSearch}
                onChange={e => setInviteSearch(e.target.value)}
                className={styles.inviteSearchInput}
              />
              {inviteSearch && <button onClick={() => setInviteSearch('')} className={styles.clearSearchBtn}><X size={12} /></button>}
            </div>

            <div className={styles.inviteUserList}>
              {availableToInvite.map(user => {
                const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || 'User';
                const selected = inviteSelected.find(u => u.id === user.id);
                return (
                  <div
                    key={user.id}
                    className={`${styles.inviteUserRow} ${selected ? styles.inviteUserRowSelected : ''}`}
                    onClick={() => setInviteSelected(prev =>
                      prev.find(u => u.id === user.id)
                        ? prev.filter(u => u.id !== user.id)
                        : [...prev, user]
                    )}
                  >
                    <img
                      src={user.profilePictureUrl || userProfile}
                      alt={name}
                      className={styles.inviteUserAvatar}
                      onError={e => { e.target.src = userProfile; }}
                    />
                    <div className={styles.inviteUserInfo}>
                      <span className={styles.inviteUserName}>{name}</span>
                      <span className={styles.inviteUserEmail}>{user.email}</span>
                    </div>
                    <div className={styles.inviteCheckIcon}>
                      {selected ? <Check size={16} color="#2e7d32" /> : <Plus size={16} color="#aaa" />}
                    </div>
                  </div>
                );
              })}
              {availableToInvite.length === 0 && (
                <p className={styles.noResultsText}>No users found.</p>
              )}
            </div>

            <div className={styles.inviteActions}>
              <button className={styles.cancelActionBtn} onClick={() => setView('main')}>Cancel</button>
              <button
                className={styles.confirmActionBtn}
                onClick={handleAddMembers}
                disabled={inviteSelected.length === 0 || addingMembers}
              >
                {addingMembers ? 'Adding...' : `Add Members${inviteSelected.length > 0 ? ` (${inviteSelected.length})` : ''}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── REPORT MEMBER VIEW ── */}
      {view === 'reportMember' && reportTarget && (
        <>
          <div className={styles.groupInfoHeader}>
            <button className={styles.panelCloseBtn} onClick={() => { setView('main'); setReportTarget(null); }}><ArrowLeft size={18} /></button>
            <h3 className={styles.groupInfoTitle}>Report Member</h3>
          </div>
          <div className={styles.reportMemberBody}>
            <div className={styles.reportWarningBanner}>
              <AlertTriangle size={14} />
              <span>WARNING: False reports are subject to penalties.</span>
            </div>

            <div className={styles.reportTargetRow}>
              <img
                src={reportTarget.profilePictureUrl || userProfile}
                alt=""
                className={styles.reportTargetAvatar}
                onError={e => { e.target.src = userProfile; }}
              />
              <span className={styles.reportTargetName}>
                {reportTarget.firstName
                  ? `${reportTarget.firstName} ${reportTarget.lastName || ''}`.trim()
                  : reportTarget.displayName || 'User'}
              </span>
            </div>

            <div className={styles.editFieldGroup}>
              <label className={styles.editFieldLabel}>Reason for Reporting</label>
              <textarea
                className={styles.editFieldTextarea}
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="Insert Report Description Here..."
                rows={4}
              />
            </div>

            <div className={styles.editFieldGroup}>
              <label className={styles.editFieldLabel}>Image Proof (Required)</label>
              <label className={styles.fileUploadLabel}>
                {reportImage ? <><Check size={14} /> {reportImage.name}</> : <><Paperclip size={14} /> Attach Image</>}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      const sizeInMB = file.size / (1024 * 1024);
                      if (sizeInMB > 5) {
                        setAlertMessage(`${file.name} exceeds the 5 MB limit for images.`);
                        return;
                      }
                      setReportImage(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className={styles.reportActions}>
              <button
                className={styles.noReportBtn}
                onClick={() => { setView('main'); setReportTarget(null); setReportReason(''); setReportImage(null); }}
                disabled={submittingReport}
              >
                No
              </button>
              <button
                className={styles.yesReportBtn}
                onClick={handleReportMember}
                disabled={submittingReport}
              >
                {submittingReport ? 'Sending...' : 'Yes'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── KICK MEMBER VIEW ── */}
      {view === 'kickMember' && kickTarget && (
        <>
          <div className={styles.groupInfoHeader}>
            <button className={styles.panelCloseBtn} onClick={() => { setView('main'); setKickTarget(null); }}><ArrowLeft size={18} /></button>
            <h3 className={styles.groupInfoTitle}>Kick Member</h3>
          </div>
          <div className={styles.reportMemberBody}>
            <div className={styles.reportWarningBanner} style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
              <AlertTriangle size={14} />
              <span>Confirm Action: Kicking member will remove them from this chat and its associated event.</span>
            </div>

            <div className={styles.reportTargetRow}>
              <img
                src={kickTarget.profilePictureUrl || userProfile}
                alt=""
                className={styles.reportTargetAvatar}
                onError={e => { e.target.src = userProfile; }}
              />
              <span className={styles.reportTargetName}>
                {kickTarget.firstName
                  ? `${kickTarget.firstName} ${kickTarget.lastName || ''}`.trim()
                  : kickTarget.displayName || 'User'}
              </span>
            </div>

            <p style={{ fontSize: '14px', color: '#4b5563', margin: '20px 0', textAlign: 'center' }}>
              Are you sure you want to kick this member from the group?
            </p>

            <div className={styles.reportActions}>
              <button
                className={styles.noReportBtn}
                onClick={() => { setView('main'); setKickTarget(null); }}
              >
                No
              </button>
              <button
                className={styles.yesReportBtn}
                onClick={handleKickMember}
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              >
                Yes
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── CONFIRM LEAVE MODAL ── */}
      {confirmLeave && (
        <div className={styles.inlinePanelOverlay}>
          <div className={styles.inlinePanelConfirm}>
            <h4 className={styles.confirmTitle}>Leave Group?</h4>
            <p className={styles.confirmText}>Are you sure you want to leave this group chat?</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelActionBtn} onClick={() => setConfirmLeave(false)}>Cancel</button>
              <button className={styles.dangerActionBtn} onClick={handleLeaveGroup}>Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSFER LEADER MODAL ── */}
      {showTransferLeader && (
        <div className={styles.inlinePanelOverlay}>
          <div className={styles.inlinePanelConfirm} style={{ maxWidth: 340, width: '92%' }}>
            <h4 className={styles.confirmTitle}>Choose New Leader</h4>
            <p className={styles.confirmText}>You are the group leader. Pick a member to take over before you leave.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', margin: '8px 0 16px' }}>
              {memberDetails
                .filter(m => m.id !== currentUser.uid)
                .map(member => {
                  const name = member.firstName
                    ? `${member.firstName} ${member.lastName || ''}`.trim()
                    : member.displayName || 'User';
                  const selected = transferTarget?.id === member.id;
                  return (
                    <div
                      key={member.id}
                      onClick={() => setTransferTarget(member)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                        background: selected ? '#e8f5e9' : '#f8fafc',
                        border: selected ? '1.5px solid #4caf50' : '1.5px solid #e2e8f0',
                        transition: '0.15s ease'
                      }}
                    >
                      <img
                        src={member.profilePictureUrl || userProfile}
                        alt={name}
                        style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { e.target.src = userProfile; }}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>{name}</span>
                      {selected && <Check size={14} color="#2e7d32" style={{ marginLeft: 'auto' }} />}
                    </div>
                  );
                })}
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.cancelActionBtn} onClick={() => { setShowTransferLeader(false); setTransferTarget(null); }}>Cancel</button>
              <button className={styles.dangerActionBtn} onClick={handleTransferAndLeave} disabled={!transferTarget}>Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM REMOVE MEMBER MODAL ── */}
      {removingMember && removingMember !== 'toggle' && removingMember !== 'confirm_bulk' && (
        <div className={styles.inlinePanelOverlay}>
          <div className={styles.inlinePanelConfirm}>
            <h4 className={styles.confirmTitle}>
              Remove {removingMember.firstName || removingMember.displayName || 'this member'}?
            </h4>
            <p className={styles.confirmText}>Are you sure you want to remove this member from the group?</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelActionBtn} onClick={() => setRemovingMember('toggle')}>Cancel</button>
              <button className={styles.dangerActionBtn} onClick={() => handleRemoveMember(removingMember)}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM BULK REMOVE MODAL ── */}
      {removingMember === 'confirm_bulk' && (
        <div className={styles.inlinePanelOverlay}>
          <div className={styles.inlinePanelConfirm}>
            <h4 className={styles.confirmTitle}>Remove Selected?</h4>
            <p className={styles.confirmText}>
              Are you sure you want to remove the {selectedToRemove.length} selected member(s) from the group?
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelActionBtn} onClick={() => setRemovingMember('toggle')}>Cancel</button>
              <button className={styles.dangerActionBtn} onClick={handleBulkRemoveMembers}>Remove</button>
            </div>
          </div>
        </div>
      )}
      
      {alertMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }} onClick={() => setAlertMessage(null)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#1e293b', fontWeight: 700 }}>Notice</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#475569', lineHeight: 1.5 }}>{alertMessage}</p>
            <button
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#28a786',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
              onClick={() => setAlertMessage(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// USER INFO PANEL (For Direct Messages)
// ─────────────────────────────────────────────
const UserInfoPanel = ({ chatData, currentUser, allUsers, onClose }) => {
  const [view, setView] = useState('main');
  const [reportReason, setReportReason] = useState('');
  const [reportImage, setReportImage] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const otherUserId = chatData?.participantIds?.find(id => id !== currentUser?.uid);
  const otherUser = allUsers.find(u => u.id === otherUserId) || {};
  const otherUserName = otherUser.firstName ? `${otherUser.firstName} ${otherUser.lastName || ''}`.trim() : (otherUser.displayName || chatData?.chatName);

  const handleReportUser = async () => {
    const sanitizedReason = sanitizeInput(reportReason);
    if (!sanitizedReason) return setAlertMessage('Please enter a reason for reporting.');
    if (!reportImage) return setAlertMessage('Please attach image proof.');
    setSubmittingReport(true);
    try {
      const storageRef = ref(storage, `reports_proof/${Date.now()}_${reportImage.name}`);
      const uploadResult = await uploadBytes(storageRef, reportImage);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        reporterName: currentUser.fullName || currentUser.email || '',
        reportedUserId: otherUser.id || '',
        reportedUserEmail: otherUser.email || '',
        reason: sanitizedReason,
        proofImageUrl: downloadURL,
        status: 'Pending',
        createdAt: serverTimestamp(),
        context: `Direct Message Chat`
      });
      setAlertMessage('Report submitted successfully.');
      setTimeout(() => {
        setReportReason('');
        setReportImage(null);
        setView('main');
        setAlertMessage(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setAlertMessage('Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className={styles.groupInfoPanel}>
      {view === 'main' && (
        <>
          <div className={styles.groupInfoHeader}>
            <button className={styles.panelCloseBtn} onClick={onClose}><X size={18} /></button>
            <h3 className={styles.groupInfoTitle}>User Info</h3>
          </div>
          {alertMessage && <div className={styles.alertBanner} style={{ margin: '16px', padding: '10px', background: '#d1fae5', color: '#065f46', borderRadius: '4px' }}>{alertMessage}</div>}
          
          <div className={styles.groupHeroSection}>
            <div className={styles.groupAvatarWrap}>
              <img 
                src={otherUser.profilePictureUrl || chatData?.chatImage || userProfile} 
                alt="" 
                className={styles.groupAvatarLarge} 
                onError={e => { e.target.src = userProfile; }} 
              />
            </div>
            <h2 className={styles.groupHeroName}>{otherUserName}</h2>
            <p className={styles.groupDescription}>{otherUser.email}</p>
          </div>

          <div className={styles.leaveGroupSection} style={{ marginTop: 'auto' }}>
            <button className={styles.leaveGroupBtn} onClick={() => setView('reportUser')}>
              <AlertTriangle size={16} style={{ marginRight: '6px' }} /> Report User
            </button>
          </div>
        </>
      )}

      {view === 'reportUser' && (
        <>
          <div className={styles.groupInfoHeader}>
            <button className={styles.panelCloseBtn} onClick={() => setView('main')}><ArrowLeft size={18} /></button>
            <h3 className={styles.groupInfoTitle}>Report User</h3>
          </div>
          <div className={styles.reportMemberBody}>
            {alertMessage && <div className={styles.alertBanner} style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', marginBottom: '10px', borderRadius: '4px' }}>{alertMessage}</div>}
            <div className={styles.reportWarningBanner}>
              <AlertTriangle size={14} />
              <span>WARNING: False reports are subject to penalties.</span>
            </div>
            <div className={styles.reportTargetRow}>
              <img src={otherUser.profilePictureUrl || chatData?.chatImage || userProfile} alt="" className={styles.reportTargetAvatar} onError={e => { e.target.src = userProfile; }} />
              <span className={styles.reportTargetName}>{otherUserName}</span>
            </div>
            <div className={styles.editFieldGroup}>
              <label className={styles.editFieldLabel}>Reason for Reporting</label>
              <textarea
                className={styles.editFieldTextarea}
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="Insert Report Description Here..."
                rows={4}
              />
            </div>
            <div className={styles.editFieldGroup}>
              <label className={styles.editFieldLabel}>Image Proof (Required)</label>
              <label className={styles.fileUploadLabel}>
                {reportImage ? <><Check size={14} /> {reportImage.name}</> : <><Paperclip size={14} /> Attach Image</>}
                <input type="file" accept="image/*" hidden onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const sizeInMB = file.size / (1024 * 1024);
                    if (sizeInMB > 5) {
                      setAlertMessage(`${file.name} exceeds the 5 MB limit for images.`);
                      return;
                    }
                    setReportImage(file);
                  }
                }} />
              </label>
            </div>
            <div className={styles.reportActions}>
              <button className={styles.noReportBtn} onClick={() => { setView('main'); setReportReason(''); setReportImage(null); }} disabled={submittingReport}>Cancel</button>
              <button className={styles.yesReportBtn} onClick={handleReportUser} disabled={submittingReport}>{submittingReport ? 'Sending...' : 'Submit Report'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const FEASTMessages = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [chats, setChats] = useState([]);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [drafts, setDrafts] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // New chat modal
  const [showNewConvoModal, setShowNewConvoModal] = useState(false);
  const [isConfiguringGroup, setIsConfiguringGroup] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState(null);

  // File & preview
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Action states
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isChatDeleteModalOpen, setIsChatDeleteModalOpen] = useState(false);
  const [selectedChatForDelete, setSelectedChatForDelete] = useState(null);
  const [selectedMsgForDelete, setSelectedMsgForDelete] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);

  // Group info panel
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Mobile: sidebar open
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);

  const currentDraft = drafts[activeChatId] || { text: '', files: [], replyingTo: null, editingMessage: null };
  const updateCurrentDraft = (updates) => {
    setDrafts(prev => ({ ...prev, [activeChatId]: { ...currentDraft, ...updates } }));
  };

  // ── Auth ──
  useEffect(() => {
    let unsubscribeUserDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeUserDoc = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCurrentUser({
              uid: user.uid,
              fullName: `${userData.firstName} ${userData.lastName}`,
              profilePictureUrl: userData.profilePictureUrl,
              ...userData
            });
          } else {
            setCurrentUser(user);
          }
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // ── Fetch all users for new chat modal ──
  useEffect(() => {
    if (!showNewConvoModal) return;
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), limit(100));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== currentUser?.uid && u.role !== 'guest');
      setAllUsers(usersList);
    };
    fetchUsers();
  }, [showNewConvoModal, currentUser]);

  // ── Fetch all users for group invite (always loaded) ──
  useEffect(() => {
    if (!currentUser) return;
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), limit(100));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== currentUser?.uid && u.role !== 'guest');
      setAllUsers(usersList);
    };
    fetchUsers();
  }, [currentUser]);

  // ── Click outside handler ──
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenuId && !event.target.closest('.menu-wrapper')) {
        setActiveMenuId(null);
      }
      if (showEmojiPicker && !event.target.closest('.emoji-picker-wrapper') && !event.target.closest('.emoji-toggle-btn')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId, showEmojiPicker]);

  // ── Chats stream ──
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', currentUser.uid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, async (snap) => {
      const chatList = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let name = data.groupName || 'Group Chat';
        let img = data.groupPhoto || data.groupImageUrl || userProfile;
        let pNames = '';
        if (!data.isGroup) {
          const otherId = data.participantIds.find(id => id !== currentUser.uid);
          if (otherId) {
            const uSnap = await getDoc(doc(db, 'users', otherId));
            if (uSnap.exists()) {
              const ud = uSnap.data();
              name = `${ud.firstName} ${ud.lastName}`;
              img = ud.profilePictureUrl || userProfile;
            }
          }
        } else {
          const pDocs = await Promise.all(data.participantIds.map(id => getDoc(doc(db, 'users', id))));
          pNames = pDocs.filter(doc => doc.exists()).map(doc => doc.data().firstName).join(', ');
        }
        return { id: d.id, ...data, chatName: name, chatImage: img, participantNames: pNames };
      }));
      setChats(chatList);
    });
    return () => unsubscribe();
  }, [currentUser]);
  // ── Messages stream ──
  useEffect(() => {
    if (!activeChatId || !currentUser) return;
    const q = query(collection(db, 'chats', activeChatId, 'messages'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      let updatedMessages = await Promise.all(
        snap.docs.map(async (d) => {
          const msgData = d.data();
          let updatedPhoto = msgData.senderPhoto || userProfile;
          let updatedName = msgData.senderName || 'User';
          try {
            if (msgData.senderId) {
              const senderSnap = await getDoc(doc(db, 'users', msgData.senderId));
              if (senderSnap.exists()) {
                const senderData = senderSnap.data();
                updatedPhoto = senderData.profilePictureUrl || userProfile;
                updatedName = `${senderData.firstName} ${senderData.lastName}`;
              }
            }
          } catch (err) { console.error(err); }
          return { id: d.id, ...msgData, senderPhoto: updatedPhoto, senderName: updatedName };
        })
      );
      updatedMessages.sort((a, b) => {
        const timeA = a.createdAt || a.sentAt || { toDate: () => new Date(0) };
        const timeB = b.createdAt || b.sentAt || { toDate: () => new Date(0) };
        return timeA.toDate() - timeB.toDate();
      });
      setMessages(updatedMessages);

      // Mark messages as read on web
      const batch = writeBatch(db);
      let hasUpdates = false;
      snap.docs.forEach((docSnap) => {
        const msgData = docSnap.data();
        const readBy = msgData.readBy || [];
        if (!readBy.includes(currentUser.uid)) {
          batch.update(docSnap.ref, {
            readBy: arrayUnion(currentUser.uid)
          });
          hasUpdates = true;
        }
      });
      if (hasUpdates) {
        await batch.commit();
        // Also set unread.$uid = false on parent chat document
        await updateDoc(doc(db, 'chats', activeChatId), {
          [`unread.${currentUser.uid}`]: false
        });
      }
    });
    return () => unsubscribe();
  }, [activeChatId, currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // ── Helpers ──
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
    setGroupName('');
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
          await updateDoc(doc(db, 'chats', existing.id), { hiddenBy: arrayRemove(currentUser.uid) });
        }
        setActiveChatId(existing.id);
        setMobileSidebarOpen(false);
        resetGroupState();
        return;
      }
      const newChatRef = await addDoc(collection(db, 'chats'), {
        participantIds: [currentUser.uid, otherUser.id],
        isGroup: false,
        lastMessage: 'New conversation started',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        hiddenBy: []
      });
      setActiveChatId(newChatRef.id);
      setMobileSidebarOpen(false);
      resetGroupState();
    } else {
      setIsConfiguringGroup(true);
    }
  };

  const handleGroupPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > 5) {
        setAlertMessage(`${file.name} exceeds the 5 MB limit for images.`);
        return;
      }
      setGroupPhoto(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateGroupChat = async () => {
    try {
      setUploading(true);
      let photoUrl = '';
      if (groupPhoto) {
        const storageRef = ref(storage, `groupPhotos/${Date.now()}_${groupPhoto.name}`);
        const snap = await uploadBytes(storageRef, groupPhoto);
        photoUrl = await getDownloadURL(snap.ref);
      }
      const allParticipantIds = [currentUser.uid, ...selectedUsers.map(u => u.id)];
      const sanitizedGroupName = sanitizeInput(groupName) || 'Group Chat';
      const newChatRef = await addDoc(collection(db, 'chats'), {
        participantIds: allParticipantIds,
        adminIds: [currentUser.uid],
        creatorId: currentUser.uid,
        isGroup: true,
        groupName: sanitizedGroupName,
        groupPhoto: photoUrl,
        groupImageUrl: photoUrl,
        description: '',
        lastMessage: 'Group chat created',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        hiddenBy: []
      });
      setActiveChatId(newChatRef.id);
      setMobileSidebarOpen(false);
      resetGroupState();
    } catch (err) { console.error(err); } finally { setUploading(false); }
  };
  const handleSelectChat = async (chat) => {
    setActiveChatId(chat.id);
    setShowGroupInfo(false);
    setMobileSidebarOpen(false);
    try {
      await updateDoc(doc(db, 'chats', chat.id), {
        [`unread.${currentUser.uid}`]: false
      });
    } catch (err) { console.error(err); }
    if (chat.hiddenBy?.includes(currentUser.uid)) {
      await updateDoc(doc(db, 'chats', chat.id), { hiddenBy: arrayRemove(currentUser.uid) });
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
      await updateDoc(doc(db, 'chats', selectedChatForDelete.id), {
        hiddenBy: arrayUnion(currentUser.uid)
      });
      if (activeChatId === selectedChatForDelete.id) setActiveChatId(null);
      setIsChatDeleteModalOpen(false);
      setSelectedChatForDelete(null);
    } catch (err) { console.error(err); }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      const sizeInMB = file.size / (1024 * 1024);
      if (file.type.startsWith('image/')) {
        if (sizeInMB > 5) {
          errors.push(`${file.name} exceeds the 5 MB limit for images.`);
          continue;
        }
      } else if (file.type.startsWith('video/')) {
        if (sizeInMB > 25) {
          errors.push(`${file.name} exceeds the 25 MB limit for videos.`);
          continue;
        }
      } else {
        if (sizeInMB > 10) {
          errors.push(`${file.name} exceeds the 10 MB limit for documents.`);
          continue;
        }
      }
      validFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        name: file.name,
        type: file.type
      });
    }

    if (errors.length > 0) {
      setAlertMessage(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      updateCurrentDraft({ files: [...currentDraft.files, ...validFiles] });
    }
  };

  const removeFile = (id) => {
    updateCurrentDraft({ files: currentDraft.files.filter(f => f.id !== id) });
  };

  const onEmojiClick = (emojiData) => {
    updateCurrentDraft({ text: currentDraft.text + emojiData.emoji });
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const sanitizedText = sanitizeInput(currentDraft.text);
    if (!sanitizedText && currentDraft.files.length === 0) return;
    try {
      setUploading(true);
      setShowEmojiPicker(false);
      const myName = currentUser?.fullName || 'User';
      const myPhoto = currentUser?.profilePictureUrl || '';

      if (currentDraft.editingMessage) {
        await updateDoc(doc(db, 'chats', activeChatId, 'messages', currentDraft.editingMessage.id), {
          editHistory: arrayUnion({ text: currentDraft.editingMessage.text, editedAt: new Date().toISOString() }),
          text: sanitizedText,
          isEdited: true
        });
      } else {
        const fileUploadPromises = currentDraft.files.map(async (fObj) => {
          const storageRef = ref(storage, `messages/${activeChatId}/${Date.now()}_${fObj.name}`);
          const snap = await uploadBytes(storageRef, fObj.file);
          const url = await getDownloadURL(snap.ref);
          return { url, name: fObj.name, type: fObj.type.startsWith('image/') ? 'image' : 'file' };
        });
        const uploadedFiles = await Promise.all(fileUploadPromises);
        await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
          text: sanitizedText,
          senderId: currentUser.uid,
          senderName: myName,
          senderPhoto: myPhoto,
          createdAt: serverTimestamp(),
          attachments: uploadedFiles,
          readBy: [currentUser.uid],
          replyTo: currentDraft.replyingTo ? {
            id: currentDraft.replyingTo.id,
            text: currentDraft.replyingTo.text,
            sender: currentDraft.replyingTo.senderName
          } : null,
          editHistory: [],
          isEdited: false
        });

        const unreadUpdates = {};
        if (activeChatData && activeChatData.participantIds) {
          activeChatData.participantIds.forEach(id => {
            if (id !== currentUser.uid) {
              unreadUpdates[`unread.${id}`] = true;
            }
          });
        }

        await updateDoc(doc(db, 'chats', activeChatId), {
          lastMessage: uploadedFiles.length > 0 ? `Sent ${uploadedFiles.length} file(s)` : sanitizedText,
          lastMessageAt: serverTimestamp(),
          hiddenBy: [],
          ...unreadUpdates
        });
      }
      setDrafts(prev => ({ ...prev, [activeChatId]: { text: '', files: [], replyingTo: null, editingMessage: null } }));
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
        await Promise.all(selectedMsgForDelete.attachments.map(file =>
          deleteObject(ref(storage, file.url)).catch(() => {})
        ));
      }
      await updateDoc(doc(db, 'chats', activeChatId, 'messages', selectedMsgForDelete.id), {
        text: 'deleted a message', isDeleted: true, attachments: null, editHistory: []
      });
      setIsDeleteModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  const activeChatData = chats.find(c => c.id === activeChatId);

  const visibleChats = chats.filter(c => {
    const isMatch = c.chatName.toLowerCase().includes(chatSearchTerm.toLowerCase());
    const isHidden = c.hiddenBy?.includes(currentUser?.uid);
    return chatSearchTerm.trim() === '' ? !isHidden : isMatch;
  });

  return (
    <div className={styles.messagesPageWrapper}>
      <div className={styles.messagesContentArea}>
        <div className={styles.feastMessagesRoot}>

          {/* ── SIDEBAR ── */}
          <aside className={`${styles.chatSidebarMain} ${mobileSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>Messages</h3>
              <div className={styles.chatSearchContainer}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={chatSearchTerm}
                  onChange={e => setChatSearchTerm(e.target.value)}
                  className={styles.chatSearchInput}
                />
                {chatSearchTerm && (
                  <button className={styles.clearSearchInline} onClick={() => setChatSearchTerm('')}><X size={12} /></button>
                )}
              </div>
            </div>

            <div className={styles.conversationListing}>
              {visibleChats.length === 0 && (
                <div className={styles.emptySidebarState}>
                  <p>No chats yet.</p>
                  <span>Start a new conversation!</span>
                </div>
              )}
              {visibleChats.map(chat => (
                <div
                  key={chat.id}
                  className={`${styles.conversationCard} ${activeChatId === chat.id ? styles.active : ''}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className={styles.chatAvatarWrap}>
                    <img
                      src={chat.chatImage || userProfile}
                      className={styles.chatImageCircle}
                      alt={chat.chatName}
                      onError={e => { e.target.src = userProfile; }}
                    />
                    {chat.isGroup && <div className={styles.groupBadgeDot}><Users size={8} /></div>}
                  </div>
                  <div className={styles.cardDetails}>
                    <div className={styles.cardTopRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className={styles.userNameCard} style={{ fontWeight: chat.unread?.[currentUser?.uid] ? 'bold' : 'normal' }}>
                        {chat.chatName}
                      </span>
                      {chat.unread?.[currentUser?.uid] && (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#ff3b30',
                          borderRadius: '50%',
                          display: 'inline-block',
                          marginLeft: '6px',
                          flexShrink: 0
                        }} />
                      )}
                    </div>
                    <p className={styles.cardPreview} style={{ fontWeight: chat.unread?.[currentUser?.uid] ? '500' : 'normal', color: chat.unread?.[currentUser?.uid] ? '#111' : '#666' }}>
                      {chat.lastMessage}
                    </p>
                  </div>
                  <button
                    className={styles.removeChatBtn}
                    title="Remove Chat"
                    onClick={e => promptDeleteChat(e, chat)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.sidebarFooter}>
              <button className={styles.newChatBtn} onClick={() => setShowNewConvoModal(true)}>
                <Plus size={16} /> New Chat
              </button>
            </div>
          </aside>

          {/* ── MAIN CHAT AREA ── */}
          <main className={`${styles.chatAreaMain} ${!mobileSidebarOpen ? styles.chatAreaVisible : ''}`}>
            {activeChatId ? (
              <>
                <header className={styles.chatContextHeader}>
                  <div className={styles.headerLeft}>
                    <button
                      className={styles.mobileBackBtn}
                      onClick={() => setMobileSidebarOpen(true)}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div
                      className={styles.headerInfo}
                      onClick={() => setShowGroupInfo(!showGroupInfo)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.headerAvatarWrap}>
                        <img
                          src={activeChatData?.chatImage || userProfile}
                          alt={activeChatData?.chatName}
                          className={styles.headerAvatar}
                          onError={e => { e.target.src = userProfile; }}
                        />
                        {activeChatData?.isGroup && <div className={styles.groupBadgeSmall}><Users size={7} /></div>}
                      </div>
                      <div className={styles.headerTextInfo}>
                <span className={styles.headerChatName}>{activeChatData?.chatName}</span>
                {activeChatData?.isGroup && (
                  <p className={styles.participantNamesList}>
                    {activeChatData?.participantIds?.length || 0} Member
                    {(activeChatData?.participantIds?.length || 0) !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
                    </div>
                  </div>
                  <div className={styles.headerRight}>
                    <button
                      className={`${styles.groupInfoToggleBtn} ${showGroupInfo ? styles.active : ''}`}
                      onClick={() => setShowGroupInfo(!showGroupInfo)}
                      title={activeChatData?.isGroup ? "Group Info" : "User Info"}
                    >
                      <Info size={18} />
                    </button>
                  </div>
                </header>

                <div className={styles.chatAndInfoWrapper}>
                  <div className={styles.chatHistoryContainer}>
                    {messages.map((msg) => {
                      if (msg.type === 'system') {
                        return (
                          <div key={msg.id} className={styles.systemMessageRow}>
                            <span className={styles.systemMessagePill}>{msg.text}</span>
                          </div>
                        );
                      }
                      return (
                      <div
                        key={msg.id}
                        className={`${styles.messageGroup} ${msg.senderId === currentUser?.uid ? styles.sent : styles.received}`}
                      >
                        <span className={styles.senderNameLabel}>
                          {msg.senderId === currentUser?.uid ? 'You' : msg.senderName}
                        </span>
                        <div className={styles.messageWithAvatar}>
                          {!msg.isDeleted && (
                            <img
                              src={msg.senderPhoto || userProfile}
                              className={styles.senderAvatarSmall}
                              alt={msg.senderName}
                              onError={e => { e.target.src = userProfile; }}
                            />
                          )}
                          <div className={styles.messageWrapper}>
                            <div className={`${styles.messageBubble} ${msg.isDeleted ? styles.deletedStyle : ''}`}>
                              {msg.replyTo && !msg.isDeleted && (
                                <div className={styles.replyQuoteBox}>
                                  <span className={styles.replyUser}>@{msg.replyTo.sender}</span>
                                  <p className={styles.replyTextPreview}>{msg.replyTo.text}</p>
                                </div>
                              )}
                              {msg.isDeleted ? (
                                <span className={styles.deletedInfo}>Message deleted</span>
                              ) : (
                                <>
                                  {msg.attachments?.length > 0 ? (
                                    msg.attachments.map((file, idx) => (
                                      <div key={idx} className={styles.msgAttachmentItem}>
                                        {file.type === 'image'
                                          ? <img src={file.url} className={`${styles.msgImage} ${styles.clickable}`} alt="" onClick={() => setPreviewFile(file)} />
                                          : <div className={`${styles.msgFileLink} ${styles.clickable}`} onClick={() => setPreviewFile(file)}><FileText size={16} /><span>{file.name}</span></div>
                                        }
                                      </div>
                                    ))
                                  ) : msg.attachmentUrl ? (
                                    <div className={styles.msgAttachmentItem}>
                                      {msg.attachmentName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                        ? <img src={msg.attachmentUrl} className={`${styles.msgImage} ${styles.clickable}`} alt="" onClick={() => setPreviewFile({ url: msg.attachmentUrl, name: msg.attachmentName, type: 'image' })} />
                                        : <div className={`${styles.msgFileLink} ${styles.clickable}`} onClick={() => setPreviewFile({ url: msg.attachmentUrl, name: msg.attachmentName, type: 'file' })}><FileText size={16} /><span>{msg.attachmentName}</span></div>
                                      }
                                    </div>
                                  ) : null}
                                  <div className={styles.textContentWrapper}>
                                    <p className={styles.actualMsgText}>{msg.text}</p>
                                    {msg.isEdited && (
                                      <span className={styles.editedLabel} onClick={() => setViewingHistory(msg)}>(edited)</span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            {!msg.isDeleted && (
                              <div className={styles.messageActionsContainer}>
                                <button className={styles.msgActionBtn} onClick={() => updateCurrentDraft({ replyingTo: msg })}>
                                  <Reply size={16} />
                                </button>
                                {msg.senderId === currentUser?.uid && (
                                  <div className={`${styles.menuWrapper} menu-wrapper`}>
                                    <button className={styles.msgActionBtn} onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}>
                                      <MoreVertical size={16} />
                                    </button>
                                    {activeMenuId === msg.id && (
                                      <div className={styles.actionDropdownMenu}>
                                        <button onClick={() => { updateCurrentDraft({ editingMessage: msg, text: msg.text }); setActiveMenuId(null); }}>
                                          <Edit2 size={13} /> Edit
                                        </button>
                                        <button className={styles.deleteOption} onClick={() => openDeleteConfirmation(msg)}>
                                          <Trash2 size={13} /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={styles.messageTimeUnder}>{formatTime(msg.createdAt || msg.sentAt)}</span>
                      </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* ── INFO PANEL (GROUP OR USER) ── */}
                  {showGroupInfo && (
                    activeChatData?.isGroup ? (
                      <GroupInfoPanel
                        chatData={activeChatData}
                        chatId={activeChatId}
                        currentUser={currentUser}
                        allUsers={allUsers}
                        onClose={() => setShowGroupInfo(false)}
                        onChatUpdated={() => { /* chats stream auto-updates */ }}
                      />
                    ) : (
                      <UserInfoPanel
                        chatData={activeChatData}
                        currentUser={currentUser}
                        allUsers={allUsers}
                        onClose={() => setShowGroupInfo(false)}
                      />
                    )
                  )}
                </div>

                {/* ── INPUT AREA ── */}
                <form className={styles.chatInputArea} onSubmit={handleSendMessage}>
                  {showEmojiPicker && (
                    <div className={`${styles.emojiPickerWrapper} emoji-picker-wrapper`}>
                      <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} />
                    </div>
                  )}

                  {currentDraft.files.length > 0 && (
                    <div className={styles.multiPreviewBar}>
                      {currentDraft.files.map(f => (
                        <div key={f.id} className={styles.previewChip}>
                          {f.preview ? <img src={f.preview} alt="" /> : <File size={14} />}
                          <span className={styles.fileNameTruncate}>{f.name}</span>
                          <button type="button" onClick={() => removeFile(f.id)} className={styles.removeChip}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentDraft.replyingTo && (
                    <div className={styles.inputContextBar}>
                      <div className={styles.replyPreviewContent}>
                        <span>Replying to <strong>{currentDraft.replyingTo.senderName}</strong></span>
                        <p className={styles.replyTextSnippet}>{currentDraft.replyingTo.text}</p>
                      </div>
                      <button type="button" onClick={() => updateCurrentDraft({ replyingTo: null })}><X size={14} /></button>
                    </div>
                  )}

                  {currentDraft.editingMessage && (
                    <div className={`${styles.inputContextBar} ${styles.editing}`}>
                      <span>Editing message...</span>
                      <button type="button" onClick={() => updateCurrentDraft({ editingMessage: null, text: '' })}><X size={14} /></button>
                    </div>
                  )}

                  <div className={styles.inputRow}>
                    <label htmlFor="file-up" className={styles.attachLabel}>
                      <Paperclip size={18} className={styles.iconBtn} />
                    </label>
                    <input id="file-up" type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />

                    <textarea
                      className={styles.mainTypeBox}
                      placeholder="Write message..."
                      value={currentDraft.text}
                      onChange={e => updateCurrentDraft({ text: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      rows={1}
                    />

                    <button
                      type="button"
                      className={`${styles.emojiToggleBtn} emoji-toggle-btn`}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={18} />
                    </button>

                    <button type="submit" className={styles.sendBtn} disabled={uploading}>
                      <Send size={18} color={currentDraft.text.trim() || currentDraft.files.length > 0 ? '#1b5e20' : '#ccc'} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className={styles.emptyChatView}>
                <div className={styles.centeredEmptyContent}>
                  <div className={styles.emptyIllustration}>
                    <div className={styles.emptyBubble1} />
                    <div className={styles.emptyBubble2} />
                    <div className={styles.emptyBubble3} />
                  </div>
                  <h3>Your conversations await</h3>
                  <p>Select a chat or start a new conversation</p>
                  <button className={styles.emptyNewChatBtn} onClick={() => { setShowNewConvoModal(true); setMobileSidebarOpen(true); }}>
                    <Plus size={15} /> New Chat
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Delete Chat Confirmation */}
      {isChatDeleteModalOpen && (
        <div className={styles.feastModalOverlay}>
          <div className={`${styles.messageModalContainer} ${styles.confirmation}`}>
            <div className={styles.confirmIconWrap}><Trash2 size={24} color="#d32f2f" /></div>
            <h3>Delete Conversation?</h3>
            <p>This will remove this chat from your list. The other participant(s) won't be affected.</p>
            <div className={styles.modalActionsRow}>
              <button className={styles.cancelBtn} onClick={() => setIsChatDeleteModalOpen(false)}>Cancel</button>
              <button className={`${styles.authButton} ${styles.delete}`} onClick={handleConfirmDeleteChat}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation */}
      {isDeleteModalOpen && (
        <div className={styles.feastModalOverlay}>
          <div className={`${styles.messageModalContainer} ${styles.confirmation}`}>
            <div className={styles.confirmIconWrap}><Trash2 size={24} color="#d32f2f" /></div>
            <h3>Delete Message?</h3>
            <p>This is permanent and will delete the message for everyone.</p>
            <div className={styles.modalActionsRow}>
              <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className={`${styles.authButton} ${styles.delete}`} onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit History Modal */}
      {viewingHistory && (
        <div className={styles.feastModalOverlay}>
          <div className={`${styles.messageModalContainer} ${styles.historyModal}`}>
            <div className={styles.modalHeader}>
              <div className={styles.titleWithIcon}><History size={18} /><h3>Edit History</h3></div>
              <button className={styles.modalCloseBtn} onClick={() => setViewingHistory(null)}><X size={18} /></button>
            </div>
            <div className={styles.historyList}>
              <div className={`${styles.historyItem} ${styles.current}`}>
                <span className={styles.historyTag}>Current Version</span>
                <p>{viewingHistory.text}</p>
              </div>
              {[...(viewingHistory.editHistory || [])].reverse().map((hist, i) => (
                <div key={i} className={styles.historyItem}>
                  <span className={styles.historyTime}>Edited on {formatTime(hist.editedAt)}</span>
                  <p>{hist.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewConvoModal && (
        <div className={styles.feastModalOverlay}>
          <div className={`${styles.messageModalContainer} ${styles.userSelectModal}`}>
            <div className={styles.modalHeader}>
              <h3>{isConfiguringGroup ? 'Group Details' : 'New Conversation'}</h3>
              <button className={styles.modalCloseBtn} onClick={resetGroupState}><X size={18} /></button>
            </div>

            {!isConfiguringGroup ? (
              <>
                <div className={styles.modalSearch}>
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search for people..."
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                  />
                </div>
                <div className={styles.userListResults}>
                  {allUsers
                    .filter(u => (`${u.firstName} ${u.lastName}`).toLowerCase().includes(userSearchTerm.toLowerCase()))
                    .map(user => (
                      <div
                        key={user.id}
                        className={`${styles.userSelectRow} ${selectedUsers.find(u => u.id === user.id) ? styles.selectedUser : ''}`}
                        onClick={() => toggleUserSelection(user)}
                      >
                        <img src={user.profilePictureUrl || userProfile} alt="" onError={e => { e.target.src = userProfile; }} />
                        <div className={styles.userInfoText}>
                          <span className={styles.userFullname}>{user.firstName} {user.lastName}</span>
                          <span className={styles.userHandle}>{user.email}</span>
                        </div>
                        {selectedUsers.find(u => u.id === user.id)
                          ? <Check size={16} color="#28a745" />
                          : <UserPlus size={16} color="#aaa" />}
                      </div>
                    ))}
                </div>
                <div className={styles.modalFooterAction}>
                  <button className={styles.authButton} disabled={selectedUsers.length === 0} onClick={startConversation}>
                    {selectedUsers.length > 1 ? `Create Group (${selectedUsers.length})` : 'Chat Now'}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.groupConfigContainer}>
                <div
                  className={styles.groupPhotoUpload}
                  onClick={() => document.getElementById('group-photo-input').click()}
                >
                  {groupPhotoPreview
                    ? <img src={groupPhotoPreview} alt="Preview" className={styles.previewCircle} />
                    : <div className={styles.photoPlaceholder}><Camera size={28} /></div>}
                  <span className={styles.uploadPhotoLabel}>{groupPhoto ? 'Change Photo' : 'Upload Group Photo'}</span>
                  <input id="group-photo-input" type="file" hidden accept="image/*" onChange={handleGroupPhotoChange} />
                </div>
                <input
                  type="text"
                  className={styles.groupNameInput}
                  placeholder="Enter Group Chat Name"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />
                <div className={styles.modalActionsRow}>
                  <button className={styles.cancelBtn} onClick={() => setIsConfiguringGroup(false)}>Back</button>
                  <button className={styles.authButton} onClick={handleCreateGroupChat} disabled={uploading}>
                    {uploading ? 'Creating...' : 'Start Group Chat'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Preview Lightbox */}
      {previewFile && (
        <div className={styles.lightboxOverlay} onClick={() => setPreviewFile(null)}>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeLightbox} onClick={() => setPreviewFile(null)}><X size={28} /></button>
            {previewFile.type === 'image'
              ? <img src={previewFile.url} alt="" />
              : <div className={styles.filePreviewCard}><FileText size={48} color="#1b5e20" /><p>{previewFile.name}</p></div>}
            <a href={previewFile.url} download={previewFile.name} target="_blank" rel="noreferrer" className={`${styles.authButton} ${styles.downloadLink}`}>
              <Download size={16} /> Download
            </a>
          </div>
        </div>
      )}

      {alertMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }} onClick={() => setAlertMessage(null)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#1e293b', fontWeight: 700 }}>Notice</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#475569', lineHeight: 1.5 }}>{alertMessage}</p>
            <button
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#28a786',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
              onClick={() => setAlertMessage(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default FEASTMessages;