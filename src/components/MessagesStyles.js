const messagesStyles = {
  pageWrapper: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #D4E4BC 0%, #E8F5E9 100%)',
    overflow: 'hidden'
  },
  mainContent: { 
    display: 'flex', 
    flex: 1, 
    padding: '20px', 
    gap: '20px',
    height: 'calc(100vh - 80px)',
    overflow: 'hidden'
  },
  sidebar: {
    width: '300px',
    backgroundColor: '#FFF',
    borderRadius: '30px', 
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    height: '100%'
  },
  searchContainer: { 
    width: '100%', 
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center'
  },
  searchInput: {
    width: '90%', 
    padding: '10px 15px',
    borderRadius: '25px',
    border: '1px solid #EEE',
    backgroundColor: '#F9F9F9',
    outline: 'none'
  },
  chatList: { 
    flex: 1, 
    overflowY: 'auto',
    paddingRight: '5px',
    marginBottom: '15px'
  },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '15px',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'background-color 0.2s'
  },
  avatarSmall: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#CCC' },
  chatName: { fontWeight: 'bold', fontSize: '14px' },
  chatStatus: { fontSize: '11px', color: '#666' },

  // --- REUSABLE MODAL STYLES ---
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: '30px',
    borderRadius: '25px',
    width: '350px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  modalInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #DDD',
    marginBottom: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px'
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #CCC',
    backgroundColor: '#F5F5F5',
    cursor: 'pointer',
    fontWeight: '600'
  },
  confirmBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#2D5A27', 
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: '0.2s opacity'
  },
  errorIcon: {
    fontSize: '40px',
    marginBottom: '10px'
  },

  // Sidebar Action Button
  newChatBtn: {
    marginTop: 'auto', 
    backgroundColor: '#2D5A27',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: '0.3s background'
  },

  // --- CHAT WINDOW STYLES ---
  chatWindow: {
    flex: 1,
    backgroundColor: '#D9D9D9',
    borderRadius: '30px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  chatHeader: {
    padding: '15px 25px',
    backgroundColor: '#FFF',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    borderBottom: '1px solid #EEE'
  },
  avatarHeader: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#BBB' },
  headerName: { fontWeight: 'bold' },
  headerStatus: { fontSize: '12px', color: '#666' },

  messageArea: { 
    flex: 1, 
    padding: '20px', 
    overflowY: 'auto', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '15px' 
  },
  theirMsgRow: { display: 'flex', alignItems: 'flex-end', gap: '10px', alignSelf: 'flex-start' },
  myMsgRow: { display: 'flex', alignItems: 'flex-end', gap: '10px', alignSelf: 'flex-end' },
  avatarMsg: { width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#999' },
  
  theirBubble: { 
    backgroundColor: '#B8D5A0', 
    padding: '12px 20px', 
    borderRadius: '15px', 
    maxWidth: '70%',
    wordWrap: 'break-word' 
  },
  myBubble: { 
    backgroundColor: '#82CFFF', 
    padding: '12px 20px', 
    borderRadius: '15px', 
    maxWidth: '70%',
    wordWrap: 'break-word' 
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#888',
    padding: '0 10px'
  },
  attachmentPreview: {
    backgroundColor: '#FFF',
    padding: '10px 20px',
    borderRadius: '15px 15px 0 0',
    fontSize: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #EEE',
    margin: '0 10px'
  },
  removeFileBtn: {
    background: 'none',
    border: 'none',
    color: 'red',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  attachedImage: {
    maxWidth: '100%',
    borderRadius: '10px',
    marginBottom: '8px',
    display: 'block'
  },
  fileAttachment: {
    padding: '10px',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '13px'
  },
  inputWrapper: { padding: '15px', backgroundColor: '#D9D9D9' },
  inputContainer: {
    backgroundColor: '#FFF',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    padding: '5px 20px'
  },
  messageInput: { flex: 1, border: 'none', outline: 'none', padding: '12px', fontSize: '14px' },
  sendButton: { background: 'none', border: 'none', color: '#4FB3FF', fontSize: '24px', cursor: 'pointer' }
};

export default messagesStyles;