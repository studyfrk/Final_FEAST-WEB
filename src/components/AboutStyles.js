const Styles = {
  // Hero Header
  heroHeader: {
    height: '600px', // Full height hero is 600px
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  heroContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 100px',
    color: '#FFFFFF', // All hero text is white
    backgroundColor: 'rgba(0,0,0,0.3)', // Slight overlay for readability
  },
  heroTitle: { fontSize: '48px', fontWeight: 'bold', margin: '0 0 20px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' },
  heroSubtitle: { fontSize: '18px', maxWidth: '600px', margin: '0 0 40px 0' },
  joinUsButton: {
    width: 'fit-content',
    padding: '12px 30px',
    backgroundColor: '#357C49', // Solid dark green from visual
    color: '#FFFFFF',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: '4px',
  },

  // Info Cards
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '40px',
    padding: '80px 100px',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflow: 'hidden', // Required for accent
  },
  cardHeaderAccent: { height: '8px', backgroundColor: '#B4D3A1' }, // Accent green bar
  cardBody: { padding: '30px' },
  cardTitle: { color: '#000000', margin: '0 0 15px 0' },
  cardContent: { color: '#555555', margin: '0 0 20px 0', lineHeight: '1.6' },
  learnMoreLink: { color: '#B4D3A1', textDecoration: 'underline', cursor: 'pointer' },

  quoteSection: {
    height: '400px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#4A8555', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quoteOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(74, 133, 85, 0.7)', 
    zIndex: 0,
  },
  quoteContent: { zIndex: 1, color: '#FFFFFF', textAlign: 'center', maxWidth: '800px' },
  quoteText: { fontSize: '28px', fontWeight: 'bold', fontStyle: 'italic', margin: '0 0 15px 0' },
  quoteCite: { fontSize: '18px' },

  // About Us / Tab Section
  aboutUsSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    padding: '80px 100px',
    backgroundColor: '#FFFFFF',
  },
  aboutUsHeader: { color: '#B4D3A1', margin: '0 0 20px 0', fontSize: '36px' },
  tabContainer: {
    display: 'flex',
    borderBottom: '2px solid #EEEEEE',
    margin: '30px 0',
  },
  tabButton: {
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#000000',
    fontWeight: 'bold',
  },
  activeTabButton: {
    backgroundColor: '#B4D3A1', // Accent color when selected
    color: '#FFFFFF',
  },

  // Image Layout
  aboutImagesContainer: { position: 'relative', height: '100%' },
  mainGroupImage: { width: '80%', height: 'auto', display: 'block', margin: '0 0 0 auto' },
  subImage: {
    width: '60%',
    height: 'auto',
    position: 'absolute',
    bottom: '-50px', 
    left: '0',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
  },

  footerContainer: {
    backgroundColor: '#E8EDD1', // The pale green/yellow background from your image
    padding: '60px 100px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '40px',
    marginTop: 'auto',
  },
  footerColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  footerHeader: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#000',
    marginBottom: '10px',
  },
  footerText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333',
  },
  footerList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '14px',
    lineHeight: '2',
    color: '#333',
  },
  socialIcons: {
    display: 'flex',
    gap: '15px',
    marginTop: '10px',
  },
  socialIcon: {
    width: '32px',
    height: '32px',
    cursor: 'pointer',
  },
  footerPillButton: {
    backgroundColor: '#000',
    color: '#FFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '20px', // Creates the pill shape
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: 'fit-content',
  },
  footerPillButtonSmall: {
    backgroundColor: '#000',
    color: '#FFF',
    border: 'none',
    padding: '8px 25px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: 'fit-content',
    marginTop: '10px',
  },
  subscribeInput: {
    backgroundColor: '#FFF',
    border: 'none',
    padding: '10px',
    width: '100%',
    maxWidth: '200px',
  },
};

export default Styles;