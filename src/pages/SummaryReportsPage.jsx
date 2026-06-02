/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';

/* Icon Imports */
import { 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  Package, 
  Users, 
  Activity, 
  FileText,
  PieChart,
  Heart,
  Gift
, X } from 'lucide-react';

/* Component Imports */
import AnimatedModal from '../components/AnimatedModal';

/* Style Imports */
import styles from '../components/summary_reports.module.css';

const SummaryReportsPage = () => {
  const [timeframe, setTimeframe] = useState('monthly'); // 'weekly', 'monthly', 'yearly', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [aidRequests, setAidRequests] = useState([]);
  const [charityEvents, setCharityEvents] = useState([]);
  const [donationFunds, setDonationFunds] = useState([]);
  const [donationItems, setDonationItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [itemsModalPage, setItemsModalPage] = useState(1);

  // Stats States
  const [filteredAid, setFilteredAid] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [stats, setStats] = useState({
    // Monetary Fundraising
    totalFundraisers: 0,
    totalFundraiserGoal: 0,
    totalFundraiserRaised: 0,
    fundraiserCompletionRate: 0,
    // In-Kind Items
    totalInKindRequests: 0,
    totalInKindDonated: 0,
    // Events
    totalEventsCount: 0,
    totalAnticipatedParticipants: 0,
    avgCapacityUtilization: 0,
    // Donors
    totalFundDonations: 0,
    totalItemDonations: 0,
    totalDonationsCount: 0
  });

  // Fetch all data in real-time
  useEffect(() => {
    setLoading(true);
    
    // Listen to aid requests
    const qAid = query(collection(db, 'aid_requests'));
    const unsubAid = onSnapshot(qAid, (snapshot) => {
      setAidRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error listening to aid requests:", error);
    });

    // Listen to donation funds
    const qFunds = query(collection(db, 'donation_funds'));
    const unsubFunds = onSnapshot(qFunds, (snapshot) => {
      setDonationFunds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error(error));

    // Listen to donation items
    const qItems = query(collection(db, 'donation_items'));
    const unsubItems = onSnapshot(qItems, (snapshot) => {
      setDonationItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error(error));

    // Listen to charity events
    const qEvents = query(collection(db, 'charity_events'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setCharityEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error listening to charity events:", error);
      setLoading(false);
    });

    return () => {
      unsubAid();
      unsubEvents();
      unsubFunds();
      unsubItems();
    };
  }, []);

  // Recalculate stats whenever data, timeframe, or custom dates change
  useEffect(() => {
    let start = new Date();
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    if (timeframe === 'weekly') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (timeframe === 'monthly') {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (timeframe === 'yearly') {
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
    } else if (timeframe === 'custom') {
      if (customStartDate) {
        start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start.setDate(start.getDate() - 30); // fallback
      }
      if (customEndDate) {
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      }
    }

    // Filter Aid Requests
    const filteredA = aidRequests.filter(item => {
      if (!item.createdAt) return false;
      const date = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
      return date >= start && date <= end;
    });

    // Filter Charity Events
    const filteredE = charityEvents.filter(item => {
      if (!item.createdAt) return false;
      const date = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
      return date >= start && date <= end;
    });

    setFilteredAid(filteredA);
    setFilteredEvents(filteredE);

    // Compute stats
    let totalFundraisers = 0;
    let totalFundraiserGoal = 0;
    let totalFundraiserRaised = 0;
    
    let totalInKindRequests = 0;
    let totalInKindDonated = 0;

    filteredA.forEach(item => {
      if (item.aidType === 'Fundraiser') {
        totalFundraisers += 1;
        totalFundraiserGoal += Number(item.fundraiserGoal || 0);
        totalFundraiserRaised += Number(item.raised || 0);
      } else {
        // In-Kind
        totalInKindRequests += 1;
        totalInKindDonated += Number(item.raised || 0);
      }
    });

    const totalEventsCount = filteredE.length;
    let totalAnticipatedParticipants = 0;
    let totalCapacityLimitSum = 0;
    let limitCapableEventsCount = 0;

    filteredE.forEach(item => {
      const participantsCount = Array.isArray(item.anticipatedParticipants) 
        ? item.anticipatedParticipants.length 
        : 0;
      totalAnticipatedParticipants += participantsCount;

      if (item.participantLimit && Number(item.participantLimit) > 0) {
        totalCapacityLimitSum += Number(item.participantLimit);
        limitCapableEventsCount += 1;
      }
    });

    const avgCapacityUtilization = totalCapacityLimitSum > 0
      ? Math.min(Math.round((totalAnticipatedParticipants / totalCapacityLimitSum) * 100), 100)
      : 0;

    const fundraiserCompletionRate = totalFundraiserGoal > 0
      ? Math.min(Math.round((totalFundraiserRaised / totalFundraiserGoal) * 100), 100)
      : 0;

    // Process Donors
    let fundDonationsCount = 0;
    donationFunds.forEach(d => {
      if (!d.createdAt) return;
      const date = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      if (date >= start && date <= end && (d.status === 'Valid' || d.status === 'valid')) {
        fundDonationsCount++;
      }
    });

    let itemDonationsCount = 0;
    donationItems.forEach(d => {
      if (!d.createdAt) return;
      const date = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      if (date >= start && date <= end && (d.status === 'Valid' || d.status === 'valid')) {
        itemDonationsCount++;
      }
    });

    setStats({
      totalFundraisers,
      totalFundraiserGoal,
      totalFundraiserRaised,
      fundraiserCompletionRate,
      totalInKindRequests,
      totalInKindDonated,
      totalEventsCount,
      totalAnticipatedParticipants,
      avgCapacityUtilization,
      totalFundDonations: fundDonationsCount,
      totalItemDonations: itemDonationsCount,
      totalDonationsCount: fundDonationsCount + itemDonationsCount
    });

  }, [aidRequests, charityEvents, donationFunds, donationItems, timeframe, customStartDate, customEndDate]);

  // Log action helper
  const logAuditAction = async (actionDetails) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        adminName: auth.currentUser?.displayName || auth.currentUser?.email || 'Admin',
        role: 'Administrator',
        actionType: 'Report Generation',
        actionDetails: actionDetails,
        targetName: 'Summary Reports',
        eventLifecycle: 'Exported',
        status: 'Success',
        timestamp: serverTimestamp(),
        type: 'report'
      });
    } catch (err) {
      console.error("Error logging report generation audit log:", err);
    }
  };

  // Trigger window print dialog
  const handlePrint = async () => {
    await logAuditAction(`Printed ${timeframe} visual PDF summary report.`);
    window.print();
  };

  // Generate and download CSV
  const handleExportCSV = async () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel
    
    // Metadata block
    csvContent += "FEAST SYSTEM ADMIN SUMMARY REPORT\n";
    csvContent += `Report Generated On,${new Date().toLocaleString()}\n`;
    csvContent += `Selected Timeframe,${timeframe.toUpperCase()}\n`;
    if (timeframe === 'custom') {
      csvContent += `Date Interval,${customStartDate || 'N/A'} to ${customEndDate || 'N/A'}\n`;
    }
    csvContent += "\n";

    // 1. Core aggregates
    csvContent += "OVERALL SUMMARY METRICS\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Fundraising Requests,${stats.totalFundraisers}\n`;
    csvContent += `Total Monetary Goal,â‚±${stats.totalFundraiserGoal.toLocaleString()}\n`;
    csvContent += `Total Monetary Raised,â‚±${stats.totalFundraiserRaised.toLocaleString()}\n`;
    csvContent += `Fundraising Progress Rate,${stats.fundraiserCompletionRate}%\n`;
    csvContent += `Total In-Kind Requests,${stats.totalInKindRequests}\n`;
    csvContent += `Total Physical Items Received,${stats.totalInKindDonated} units\n`;
    csvContent += `Total Charity Events,${stats.totalEventsCount}\n`;
    csvContent += `Total Event Participations,${stats.totalAnticipatedParticipants} volunteers\n`;
    csvContent += `Event Occupancy Rate,${stats.avgCapacityUtilization}%\n`;
    csvContent += "\n";

    // 2. Monetary Fundraising detailed break
    csvContent += "MONETARY FUNDRAISING DETAILED RECORDS\n";
    csvContent += "Title,Category,Monetary Goal,Monetary Raised,Progress\n";
    const fundraiserItems = filteredAid.filter(item => item.aidType === 'Fundraiser');
    if (fundraiserItems.length === 0) {
      csvContent += "No records found within this timeframe,,,\n";
    } else {
      fundraiserItems.forEach(item => {
        const title = (item.title || "Untitled").replace(/,/g, " ");
        const cat = (item.category || "General").replace(/,/g, " ");
        const goal = item.fundraiserGoal || 0;
        const raised = item.raised || 0;
        const percent = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
        csvContent += `"${title}","${cat}",â‚±${goal},â‚±${raised},${percent}%\n`;
      });
    }
    csvContent += "\n";

    // 3. In-Kind detailed break
    csvContent += "IN-KIND ITEM DONATION DETAILED RECORDS\n";
    csvContent += "Title,Category,Items Donated,Needed Items\n";
    const inKindItems = filteredAid.filter(item => item.aidType !== 'Fundraiser');
    if (inKindItems.length === 0) {
      csvContent += "No records found within this timeframe,,,\n";
    } else {
      inKindItems.forEach(item => {
        const title = (item.title || "Untitled").replace(/,/g, " ");
        const cat = (item.category || "General").replace(/,/g, " ");
        const raised = item.raised || 0;
        const needed = Array.isArray(item.acceptedItems) ? item.acceptedItems.join(" | ") : "Ongoing Item Aid";
        csvContent += `"${title}","${cat}",${raised},"${needed}"\n`;
      });
    }
    csvContent += "\n";

    // 4. Charity Events detailed break
    csvContent += "CHARITY EVENTS DETAILED RECORDS\n";
    csvContent += "Title,Category,Scheduled Date,ParticipantsCount,LimitCapacity,Status\n";
    if (filteredEvents.length === 0) {
      csvContent += "No records found within this timeframe,,,,\n";
    } else {
      filteredEvents.forEach(item => {
        const title = (item.title || "Untitled").replace(/,/g, " ");
        const cat = (item.category || "General").replace(/,/g, " ");
        const date = item.date || "N/A";
        const parts = Array.isArray(item.anticipatedParticipants) ? item.anticipatedParticipants.length : 0;
        const limit = item.participantLimit || "No Limit";
        const status = item.status || "Upcoming";
        csvContent += `"${title}","${cat}",${date},${parts},${limit},${status}\n`;
      });
    }

    await logAuditAction(`Exported ${timeframe} detailed data report as CSV file.`);

    // Auto trigger anchor click down using Blob to handle encoding correctly
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FEAST_Summary_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Group events by category helper
  const getEventsByCategory = () => {
    const EVENT_CATEGORIES = ['Health', 'Disaster Management', 'Community Support', 'Education', 'Environment', 'Feeding'];
    const counts = {};
    EVENT_CATEGORIES.forEach(cat => counts[cat] = 0);
    
    filteredEvents.forEach(e => {
      const cat = e.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    
    if (counts['Other'] === 0) delete counts['Other'];
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  // Group aid by category helper
  const getAidByCategory = () => {
    const AID_CATEGORIES = ["Basic Needs", "Health", "Education", "Disaster"];
    const counts = {};
    AID_CATEGORIES.forEach(cat => counts[cat] = 0);
    
    filteredAid.forEach(a => {
      const cat = a.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    
    if (counts['Other'] === 0) delete counts['Other'];
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  return (
    <div className={styles.summaryReportsPage}>
      {/* Page Header */}
      <div className={styles.contentHeader}>
        <h2 className={styles.contentHeaderTitle}>Activity Summary & Reports</h2>
        <div className={styles.headerControls}>
          <button 
            type="button" 
            className={`${styles.actionButton} ${styles.secondary}`}
            onClick={handlePrint}
            disabled={loading}
          >
            <Printer size={18} />
            Print Visual PDF
          </button>
          
          <button 
            type="button" 
            className={styles.actionButton}
            onClick={handleExportCSV}
            disabled={loading}
          >
            <Download size={18} />
            Download CSV Report
          </button>
        </div>
      </div>

      {/* Timeframe selector bar */}
      <div className={styles.filterBar}>
        <div className={styles.timeframeOptions}>
          <button 
            type="button" 
            className={`${styles.timeframeBtn} ${timeframe === 'weekly' ? styles.active : ''}`}
            onClick={() => setTimeframe('weekly')}
          >
            Weekly
          </button>
          <button 
            type="button" 
            className={`${styles.timeframeBtn} ${timeframe === 'monthly' ? styles.active : ''}`}
            onClick={() => setTimeframe('monthly')}
          >
            Monthly
          </button>
          <button 
            type="button" 
            className={`${styles.timeframeBtn} ${timeframe === 'yearly' ? styles.active : ''}`}
            onClick={() => setTimeframe('yearly')}
          >
            Yearly
          </button>
          <button 
            type="button" 
            className={`${styles.timeframeBtn} ${timeframe === 'custom' ? styles.active : ''}`}
            onClick={() => setTimeframe('custom')}
          >
            Custom Range
          </button>
        </div>

        {timeframe === 'custom' && (
          <div className={styles.customDateInputs}>
            <span className={styles.dateInputLabel}>From:</span>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={customStartDate} 
              onChange={(e) => setCustomStartDate(e.target.value)} 
            />
            <span className={styles.dateInputLabel}>To:</span>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={customEndDate} 
              onChange={(e) => setCustomEndDate(e.target.value)} 
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <span>Aggregating FEAST activity data...</span>
        </div>
      ) : (
        <>
          {/* Card Deck overview metrics */}
          <div className={styles.cardsDeck}>
            {/* CARD 1: Monetary Fundraising */}
            <div className={styles.metricCard} style={{ '--card-color': '#10b981', '--card-bg': '#e6f4ea' }}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Monetary Fundraising</span>
                <span className={styles.metricIcon}><TrendingUp size={20} /></span>
              </div>
              <span className={styles.metricMainVal}>â‚±{stats.totalFundraiserRaised.toLocaleString()}</span>
              <span className={styles.metricSubVal}>
                Raised of â‚±{stats.totalFundraiserGoal.toLocaleString()} goal ({stats.totalFundraisers} active requests)
              </span>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${stats.fundraiserCompletionRate}%` }}
                ></div>
              </div>
            </div>

            {/* CARD 2: Physical In-Kind Item Aid */}
            <div className={styles.metricCard} style={{ '--card-color': '#a78bfa', '--card-bg': '#f5f3ff' }}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>In-Kind Item Aid</span>
                <span className={styles.metricIcon}><Package size={20} /></span>
              </div>
              <span className={styles.metricMainVal}>{stats.totalInKindDonated.toLocaleString()} units</span>
              <span className={styles.metricSubVal}>
                Physical items donated so far ({stats.totalInKindRequests} item request lists active)
              </span>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: stats.totalInKindRequests > 0 ? '75%' : '0%' }}
                ></div>
              </div>
            </div>

            {/* CARD 3: Volunteer Charity Events */}
            <div className={styles.metricCard} style={{ '--card-color': '#06b6d4', '--card-bg': '#ecfeff' }}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Charity Events</span>
                <span className={styles.metricIcon}><Users size={20} /></span>
              </div>
              <span className={styles.metricMainVal}>{stats.totalAnticipatedParticipants.toLocaleString()}</span>
              <span className={styles.metricSubVal}>
                Anticipated participations across {stats.totalEventsCount} events ({stats.avgCapacityUtilization}% occupancy)
              </span>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${stats.avgCapacityUtilization}%` }}
                ></div>
              </div>
            </div>

            {/* CARD 4: Monetary Donors */}
            <div className={styles.metricCard} style={{ '--card-color': '#f59e0b', '--card-bg': '#fef3c7' }}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Monetary Donors</span>
                <span className={styles.metricIcon}><Heart size={20} /></span>
              </div>
              <span className={styles.metricMainVal}>{stats.totalFundDonations.toLocaleString()}</span>
              <span className={styles.metricSubVal}>
                Users who donated funds
              </span>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: stats.totalFundDonations > 0 ? '100%' : '0%' }}
                ></div>
              </div>
            </div>

            {/* CARD 5: In-Kind Donors */}
            <div className={styles.metricCard} style={{ '--card-color': '#ec4899', '--card-bg': '#fdf2f8' }}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>In-Kind Donors</span>
                <span className={styles.metricIcon}><Gift size={20} /></span>
              </div>
              <span className={styles.metricMainVal}>{stats.totalItemDonations.toLocaleString()}</span>
              <span className={styles.metricSubVal}>
                Users who donated physical items
              </span>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: stats.totalItemDonations > 0 ? '100%' : '0%' }}
                ></div>
              </div>
            </div>
            {/* CARD 6: Donated Items List */}
            <div 
              className={styles.metricCard} 
              style={{ '--card-color': '#8b5cf6', '--card-bg': '#ede9fe', cursor: 'pointer' }}
              onClick={() => { setItemsModalPage(1); setShowItemsModal(true); }}
            >
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Donated Items List</span>
                <span className={styles.metricIcon}><FileText size={20} /></span>
              </div>
              <span className={styles.metricMainVal}>View Items</span>
              <span className={styles.metricSubVal}>
                Click to see all donated physical items
              </span>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Grids showing distributions */}
          <div className={styles.gridsContainer}>
            {/* GRID SECTION 1: Aid Requests Breakdowns */}
            <div className={styles.gridSection}>
              <div className={styles.gridSectionTitle}>
                <span>Aid Requests by Category</span>
                <span className={styles.badge}>{filteredAid.length} Total</span>
              </div>
              
              {filteredAid.length === 0 ? (
                <div className={styles.emptyState}>No requests active in selected range.</div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.reportsTable}>
                    <thead>
                      <tr>
                        <th className={styles.headerCell}>Category</th>
                        <th className={styles.headerCell} style={{ textAlign: 'center' }}>Total Requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAidByCategory().map(([cat, count]) => (
                        <tr key={cat}>
                          <td className={`${styles.tableCell} ${styles.rowName}`}>{cat}</td>
                          <td className={styles.tableCell} style={{ textAlign: 'center' }}>{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* GRID SECTION 2: Charity Events Breakdowns */}
            <div className={styles.gridSection}>
              <div className={styles.gridSectionTitle}>
                <span>Charity Events by Category</span>
                <span className={styles.badge}>{filteredEvents.length} Total</span>
              </div>
              
              {filteredEvents.length === 0 ? (
                <div className={styles.emptyState}>No events scheduled in selected range.</div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.reportsTable}>
                    <thead>
                      <tr>
                        <th className={styles.headerCell}>Category</th>
                        <th className={styles.headerCell} style={{ textAlign: 'center' }}>Total Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getEventsByCategory().map(([cat, count]) => (
                        <tr key={cat}>
                          <td className={`${styles.tableCell} ${styles.rowName}`}>{cat}</td>
                          <td className={styles.tableCell} style={{ textAlign: 'center' }}>{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ITEMS MODAL */}
      {showItemsModal && (
        <AnimatedModal onClose={() => setShowItemsModal(false)} maxWidth={500}>
          <div className={styles.modalHeader} style={{ position: 'relative', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
            <h3 className={styles.modalHeaderTitle} style={{ margin: '0 auto', textAlign: 'center', width: '100%' }}>Donated Items Details</h3>
            <button className={styles.closeBtn} onClick={() => setShowItemsModal(false)} style={{ position: 'absolute', top: '16px', right: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={24} />
            </button>
          </div>
          <div className={styles.modalBody} style={{ padding: '0', maxHeight: '60vh', overflowY: 'auto' }}>
            {(() => {
              const validItems = donationItems.filter(d => {
                if (!d.createdAt) return false;
                const date = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
                let start = new Date();
                let end = new Date();
                end.setHours(23, 59, 59, 999);
            
                if (timeframe === 'weekly') {
                  start.setDate(start.getDate() - 7);
                  start.setHours(0, 0, 0, 0);
                } else if (timeframe === 'monthly') {
                  start.setDate(start.getDate() - 30);
                  start.setHours(0, 0, 0, 0);
                } else if (timeframe === 'yearly') {
                  start.setFullYear(start.getFullYear() - 1);
                  start.setHours(0, 0, 0, 0);
                } else if (timeframe === 'custom') {
                  if (customStartDate) {
                    start = new Date(customStartDate);
                    start.setHours(0, 0, 0, 0);
                  } else {
                    start.setDate(start.getDate() - 30);
                  }
                  if (customEndDate) {
                    end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999);
                  }
                }
                return date >= start && date <= end && (d.status === 'Valid' || d.status === 'valid');
              }).flatMap(d => d.items || []);

              if (validItems.length === 0) {
                return <p style={{ textAlign: 'center', color: '#999', padding: '32px 0', fontFamily: 'var(--font)' }}>No physical items donated in this timeframe.</p>;
              }

              const ITEMS_PER_PAGE = 8;
              const totalItemsPages = Math.ceil(validItems.length / ITEMS_PER_PAGE);
              const paginatedItems = validItems.slice((itemsModalPage - 1) * ITEMS_PER_PAGE, itemsModalPage * ITEMS_PER_PAGE);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                  <table className={styles.usersTable} style={{ width: '100%', margin: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
                    <thead>
                      <tr className={styles.tableHeaderRow}>
                        <th className={styles.headerCell} style={{ paddingLeft: '24px' }}>Item Name</th>
                        <th className={styles.headerCell} style={{ textAlign: 'center' }}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((itemObj, idx) => (
                        <tr key={idx} className={styles.tableRow} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td className={styles.tableCell} style={{ paddingLeft: '24px', fontWeight: '500' }}>{itemObj.item}</td>
                          <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                            <span style={{ background: '#f8fafc', padding: '4px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: '600' }}>
                              {itemObj.quantity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {totalItemsPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px 0', borderTop: '1px solid #e2e8f0', background: '#f8fafc', marginTop: 'auto' }}>
                      <button 
                        disabled={itemsModalPage === 1}
                        onClick={() => setItemsModalPage(p => Math.max(1, p - 1))}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: itemsModalPage === 1 ? '#f1f5f9' : '#ffffff', color: itemsModalPage === 1 ? '#94a3b8' : '#334155', cursor: itemsModalPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500', transition: 'all 0.2s' }}>
                        Prev
                      </button>
                      <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Page {itemsModalPage} of {totalItemsPages}</span>
                      <button 
                        disabled={itemsModalPage === totalItemsPages}
                        onClick={() => setItemsModalPage(p => Math.min(totalItemsPages, p + 1))}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: itemsModalPage === totalItemsPages ? '#f1f5f9' : '#ffffff', color: itemsModalPage === totalItemsPages ? '#94a3b8' : '#334155', cursor: itemsModalPage === totalItemsPages ? 'not-allowed' : 'pointer', fontWeight: '500', transition: 'all 0.2s' }}>
                        Next
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </AnimatedModal>
      )}

    </div>
  );
};

export default SummaryReportsPage;