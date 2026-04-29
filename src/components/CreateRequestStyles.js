const createRequestStyles = {
  pageWrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #D4E4BC 0%, #E8F5E9 100%)',
  },
  container: { 
    display: 'flex', 
    justifyContent: 'center', 
    padding: '40px' 
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: '20px',
    padding: '40px',
    display: 'flex',
    gap: '60px',
    maxWidth: '1000px',
    width: '100%',
    boxShadow: '0px 10px 30px rgba(0,0,0,0.05)'
  },
  sectionTitle: { 
    fontSize: '28px', 
    marginBottom: '20px', 
    fontWeight: 'bold' 
  },
  mediaSection: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '15px' 
  },
  mainPlaceholder: { 
    backgroundColor: '#eee', 
    height: '300px', 
    borderRadius: '10px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    overflow: 'hidden'
  },
  thumbnailRow: { 
    display: 'flex', 
    gap: '10px' 
  },
  smallPlaceholder: { 
    backgroundColor: '#eee', 
    flex: 1, 
    height: '100px', 
    borderRadius: '10px',
    overflow: 'hidden'
  },
  previewImg: { 
    width: '100%', 
    height: '100%', 
    objectFit: 'cover' 
  },
  fileInput: { 
    display: 'none' 
  },
  uploadBtn: { 
    padding: '12px', 
    backgroundColor: '#f0f0f0', 
    textAlign: 'center', 
    borderRadius: '8px', 
    cursor: 'pointer',
    border: '1px solid #ccc',
    fontWeight: 'bold'
  },
  detailsSection: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column' 
  },
  label: { 
    fontSize: '14px', 
    fontWeight: 'bold', 
    marginBottom: '5px', 
    marginTop: '15px' 
  },
  input: { 
    padding: '12px', 
    borderRadius: '10px', 
    border: '1px solid #CCC', 
    fontSize: '14px' 
  },
  buttonRow: { 
    display: 'flex', 
    gap: '15px', 
    marginTop: '30px' 
  },
  backBtn: { 
    flex: 1, 
    padding: '12px', 
    border: '2px solid #2D5A27', 
    backgroundColor: 'transparent', 
    color: '#2D5A27', 
    borderRadius: '10px', 
    fontWeight: 'bold', 
    cursor: 'pointer' 
  },
  createBtn: { 
    flex: 1, 
    padding: '12px', 
    border: 'none', 
    backgroundColor: '#2D5A27', 
    color: 'white', 
    borderRadius: '10px', 
    fontWeight: 'bold', 
    cursor: 'pointer' 
  },
};

export default createRequestStyles;