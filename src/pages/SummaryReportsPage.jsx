/* React & Firebase Imports */
import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
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
  Gift,
  X
} from 'lucide-react';

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
  const [fetchError, setFetchError] = useState(null);

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
    setFetchError(null);

    // Listen to aid requests
    const qAid = query(collection(db, 'aid_requests'));
    const unsubAid = onSnapshot(qAid, (snapshot) => {
      setAidRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error listening to aid requests:", error);
      setFetchError("Failed to fetch aid requests data.");
      setLoading(false);
    });

    // Listen to donation funds
    const qFunds = query(collection(db, 'donation_funds'));
    const unsubFunds = onSnapshot(qFunds, (snapshot) => {
      setDonationFunds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error listening to donation funds:", error);
      setFetchError("Failed to fetch donation funds data.");
      setLoading(false);
    });

    // Listen to donation items
    const qItems = query(collection(db, 'donation_items'));
    const unsubItems = onSnapshot(qItems, (snapshot) => {
      setDonationItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error listening to donation items:", error);
      setFetchError("Failed to fetch donation items data.");
      setLoading(false);
    });

    // Listen to charity events
    const qEvents = query(collection(db, 'charity_events'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setCharityEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error listening to charity events:", error);
      setFetchError("Failed to fetch charity events data.");
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
      
      const status = (item.status || '').toLowerCase();
      const approvalStatus = (item.approvalStatus || '').toLowerCase();

      if (
        status === 'rejected' || 
        status === 'invalid' || 
        status === 'processing' || 
        status === 'pending' ||
        approvalStatus === 'processing' || 
        approvalStatus === 'unread'
      ) {
        return false;
      }

      const date = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
      return date >= start && date <= end;
    });

    // Filter Charity Events
    const filteredE = charityEvents.filter(item => {
      if (!item.createdAt) return false;

      // Exclude rejected or invalid data
      const status = (item.status || '').toLowerCase();
      const approvalStatus = (item.approvalStatus || '').toLowerCase();
      if (status === 'rejected' || status === 'invalid' || approvalStatus === 'processing' || status === 'pending') return false;

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

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('FEAST Summary Report');

    worksheet.columns = [
      { width: 42 }, // Column A: Title / Metric Descriptions
      { width: 22 }, // Column B: Category
      { width: 18 }, // Column C: Goal / Items Donated
      { width: 18 }, // Column D: Raised / Needed Items
      { width: 15 }, // Column E: Progress Rate
      { width: 18 }  // Column F: Status
    ];

    // Reusable styling configurations
    const fontCalibri = { name: 'Calibri', size: 11 };
    const borderThin = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    // --- DOCUMENT HEADER BLOCK ---
    const titleRow = worksheet.addRow(['FEAST SYSTEM ADMIN SUMMARY REPORT']);
    titleRow.getCell(1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E293B' } };
    worksheet.mergeCells('A1:F1');

    worksheet.addRow(['Report Generated On:', '', new Date().toLocaleString()]);
    worksheet.addRow(['Selected Timeframe:', '', timeframe.toUpperCase()]);
    if (timeframe === 'custom') {
      worksheet.addRow(['Date Interval:', '', `${customStartDate || 'N/A'} to ${customEndDate || 'N/A'}`]);
    }

    // Format metadata block keys
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber <= 4) {
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF475569' } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    worksheet.addRow([]); // Blank spacer row

    // --- HELPER FUNCTION FOR DATA SECTIONS ---
    const createSectionHeader = (title, isGreen = false) => {
      const row = worksheet.addRow([title]);
      worksheet.mergeCells(`A${row.number}:F${row.number}`);
      row.getCell(1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: isGreen ? 'FF166534' : 'FF334155' } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isGreen ? 'FFF0FDF4' : 'FFF8FAFC' } };
      row.getCell(1).border = { bottom: { style: 'medium', color: { argb: isGreen ? 'FFBBF7D0' : 'FFE2E8F0' } } };
      return row;
    };

    const createTableHeaders = (headers) => {
      const row = worksheet.addRow(headers);
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      });
    };

    // --- SECTION 1: OVERALL SUMMARY METRICS ---
    createSectionHeader('OVERALL SUMMARY METRICS', true);
    createTableHeaders(['Metric Key Summary Indicator', 'Aggregated Value', '', '', '', '']);
    worksheet.mergeCells(`B${worksheet.lastRow.number}:F${worksheet.lastRow.number}`);

    const metricsData = [
      ['Total Fundraising Requests', stats.totalFundraisers],
      ['Total Monetary Goal', `₱${stats.totalFundraiserGoal.toLocaleString()}`],
      ['Total Monetary Raised', `₱${stats.totalFundraiserRaised.toLocaleString()}`],
      ['Fundraising Progress Rate', `${stats.fundraiserCompletionRate}%`],
      ['Total In-Kind Requests', stats.totalInKindRequests],
      ['Total Physical Items Received', `${stats.totalInKindDonated.toLocaleString()} units`],
      ['Total Charity Events', stats.totalEventsCount],
      ['Total Event Participations', `${stats.totalAnticipatedParticipants.toLocaleString()} volunteers`],
      ['Event Occupancy Rate', `${stats.avgCapacityUtilization}%`]
    ];

    metricsData.forEach(([metric, val]) => {
      const row = worksheet.addRow([metric, val]);
      worksheet.mergeCells(`B${row.number}:F${row.number}`);

      // Force Left Alignment on column B to prevent integers from aligning right
      row.getCell(2).alignment = { horizontal: 'left' };

      row.eachCell((cell) => { cell.font = fontCalibri; cell.border = borderThin; });
    });

    worksheet.addRow([]); // Spacer

    // --- SECTION 2: MONETARY RECORDS ---
    createSectionHeader('MONETARY FUNDRAISING DETAILED RECORDS', false);
    createTableHeaders(['Title', 'Category', 'Monetary Goal', 'Monetary Raised', 'Progress Rate', '']);
    worksheet.mergeCells(`E${worksheet.lastRow.number}:F${worksheet.lastRow.number}`);

    const fundraiserItems = filteredAid.filter(item => item.aidType === 'Fundraiser');
    if (fundraiserItems.length === 0) {
      const row = worksheet.addRow(['No records found within this timeframe.']);
      worksheet.mergeCells(`A${row.number}:F${row.number}`);
      row.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' } };
    } else {
      fundraiserItems.forEach(item => {
        const goal = item.fundraiserGoal || 0;
        const raised = item.raised || 0;
        const percent = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;

        const row = worksheet.addRow([
          item.title || "Untitled",
          item.category || "General",
          `₱${goal.toLocaleString()}`,
          `₱${raised.toLocaleString()}`,
          `${percent}%`
        ]);
        worksheet.mergeCells(`E${row.number}:F${row.number}`);
        row.eachCell((cell) => { cell.font = fontCalibri; cell.border = borderThin; });
      });
    }

    worksheet.addRow([]); // Spacer

    // --- SECTION 3: IN-KIND RECORDS ---
    createSectionHeader('IN-KIND ITEM DONATION DETAILED RECORDS', false);
    createTableHeaders(['Title', 'Category', 'Items Donated (Units)', 'Target Needed Items', '', '']);
    worksheet.mergeCells(`D${worksheet.lastRow.number}:F${worksheet.lastRow.number}`);

    const inKindItems = filteredAid.filter(item => item.aidType !== 'Fundraiser');
    if (inKindItems.length === 0) {
      const row = worksheet.addRow(['No records found within this timeframe.']);
      worksheet.mergeCells(`A${row.number}:F${row.number}`);
      row.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' } };
    } else {
      inKindItems.forEach(item => {
        const needed = Array.isArray(item.acceptedItems) ? item.acceptedItems.join(" | ") : "Ongoing Item Aid";
        const row = worksheet.addRow([
          item.title || "Untitled",
          item.category || "General",
          (item.raised || 0).toLocaleString(),
          needed
        ]);
        worksheet.mergeCells(`D${row.number}:F${row.number}`);
        row.eachCell((cell) => { cell.font = fontCalibri; cell.border = borderThin; cell.alignment = { wrapText: true }; });
      });
    }

    worksheet.addRow([]); // Spacer

    // --- SECTION 4: CHARITY EVENTS ---
    createSectionHeader('CHARITY EVENTS DETAILED RECORDS', false);
    createTableHeaders(['Title', 'Category', 'Scheduled Date', 'Participants Registered', 'Limit Capacity', 'Status']);

    if (filteredEvents.length === 0) {
      const row = worksheet.addRow(['No records found within this timeframe.']);
      worksheet.mergeCells(`A${row.number}:F${row.number}`);
      row.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' } };
    } else {
      filteredEvents.forEach(item => {
        const row = worksheet.addRow([
          item.title || "Untitled",
          item.category || "General",
          item.date || "N/A",
          (Array.isArray(item.anticipatedParticipants) ? item.anticipatedParticipants.length : 0),
          item.participantLimit || "No Limit",
          item.status || "Upcoming"
        ]);
        row.eachCell((cell) => { cell.font = fontCalibri; cell.border = borderThin; });
      });
    }

      // --- WRITING THE FILE DATA STREAM ---
      await logAuditAction(`Exported ${timeframe} detailed data report as native Excel binary sheet.`);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `FEAST_Summary_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Failed to export Excel report. Please check your connection and try again.");
    }
  };

  const handlePrint = async () => {
    try {
      await logAuditAction(`Printed ${timeframe} visual PDF summary report.`);
      window.print();
    } catch (error) {
      console.error("Print error:", error);
      alert("Failed to initiate print. Please check your connection and try again.");
    }
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
      {/* PROFESSIONAL PRINT-ONLY REPORT DOCUMENT */}
      <div className={styles.printReportDocument}>
        {/* Letterhead */}
        <div className={styles.printDocHeader}>
          <p className={styles.printDocSubHeader}>Republic of the Philippines</p>
          <p className={styles.printDocSubHeader}>Province of Metro Manila • Las Piñas City</p>
          <p className={styles.printDocSubHeader}>Barangay Almanza Dos Charity & Community Services</p>
          <h1 className={styles.printDocTitle}>F.E.A.S.T. Charity Management System</h1>
          <div className={styles.printDocDivider} />
          <h2 style={{ fontSize: '14pt', margin: '0.75rem 0 0 0', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Administrative Operations Summary Report
          </h2>
        </div>

        {/* Metadata Details Grid */}
        <table className={styles.printDocMetaTable}>
          <tbody>
            <tr>
              <td className={styles.printDocMetaLabel}>Report Type:</td>
              <td className={styles.printDocMetaVal}>Charity & Volunteer Activities Summary</td>
              <td className={styles.printDocMetaLabel}>Generated On:</td>
              <td className={styles.printDocMetaVal}>{new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td className={styles.printDocMetaLabel}>Timeframe:</td>
              <td className={styles.printDocMetaVal}>{timeframe.toUpperCase()}</td>
              <td className={styles.printDocMetaLabel}>Generated By:</td>
              <td className={styles.printDocMetaVal}>{auth.currentUser?.displayName || auth.currentUser?.email || 'System Administrator'}</td>
            </tr>
            {timeframe === 'custom' && (
              <tr>
                <td className={styles.printDocMetaLabel}>Date Range:</td>
                <td className={styles.printDocMetaVal} colSpan={3}>
                  {customStartDate || 'N/A'} to {customEndDate || 'N/A'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* SECTION 1: KEY PERFORMANCE INDICATORS */}
        <h3 className={styles.printDocSectionTitle}>I. Executive Key Performance Indicators</h3>
        <table className={styles.printDocTable}>
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Metric Description</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Target / Goal</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Achieved Value</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Completion / Progress</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Monetary Fundraising (Total Raised)</td>
              <td style={{ textAlign: 'right' }}>₱{stats.totalFundraiserGoal.toLocaleString()}</td>
              <td style={{ textAlign: 'right' }}>₱{stats.totalFundraiserRaised.toLocaleString()}</td>
              <td style={{ textAlign: 'right' }}>{stats.fundraiserCompletionRate}%</td>
            </tr>
            <tr>
              <td>Physical In-Kind Item Aid</td>
              <td style={{ textAlign: 'right' }}>N/A</td>
              <td style={{ textAlign: 'right' }}>{stats.totalInKindDonated.toLocaleString()} units</td>
              <td style={{ textAlign: 'right' }}>{stats.totalInKindRequests} active requests</td>
            </tr>
            <tr>
              <td>Volunteer Charity Events</td>
              <td style={{ textAlign: 'right' }}>N/A</td>
              <td style={{ textAlign: 'right' }}>{stats.totalAnticipatedParticipants.toLocaleString()} registrations</td>
              <td style={{ textAlign: 'right' }}>{stats.totalEventsCount} scheduled events</td>
            </tr>
            <tr>
              <td>Average Event Capacity Occupancy</td>
              <td style={{ textAlign: 'right' }}>100% capacity</td>
              <td style={{ textAlign: 'right' }}>{stats.avgCapacityUtilization}% occupancy</td>
              <td style={{ textAlign: 'right' }}>{stats.avgCapacityUtilization}% progress</td>
            </tr>
            <tr className={styles.printDocTableSummary}>
              <td>Aggregated Donors Count (Overall Support)</td>
              <td style={{ textAlign: 'right' }}>N/A</td>
              <td style={{ textAlign: 'right' }}>{stats.totalDonationsCount.toLocaleString()} donors</td>
              <td style={{ textAlign: 'right' }}>{stats.totalFundDonations} cash / {stats.totalItemDonations} goods</td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 2: CATEGORY BREAKDOWNS */}
        <h3 className={styles.printDocSectionTitle}>II. Category Distribution & Breakdowns</h3>
        <div className={styles.printDocColumns}>
          {/* Aid Requests Breakdown */}
          <div className={styles.printDocColumn}>
            <h4 style={{ fontSize: '10.5pt', fontWeight: 'bold', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>
              A. Aid Requests by Category ({filteredAid.length} Total)
            </h4>
            {filteredAid.length === 0 ? (
              <p style={{ fontSize: '9.5pt', italic: true, color: '#666666' }}>No active requests in this period.</p>
            ) : (
              <table className={styles.printDocTable} style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'center', width: '35%' }}>Active Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {getAidByCategory().map(([cat, count]) => (
                    <tr key={cat}>
                      <td>{cat}</td>
                      <td style={{ textAlign: 'center' }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Charity Events Breakdown */}
          <div className={styles.printDocColumn}>
            <h4 style={{ fontSize: '10.5pt', fontWeight: 'bold', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>
              B. Charity Events by Category ({filteredEvents.length} Total)
            </h4>
            {filteredEvents.length === 0 ? (
              <p style={{ fontSize: '9.5pt', italic: true, color: '#666666' }}>No scheduled events in this period.</p>
            ) : (
              <table className={styles.printDocTable} style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'center', width: '35%' }}>Total Events</th>
                  </tr>
                </thead>
                <tbody>
                  {getEventsByCategory().map(([cat, count]) => (
                    <tr key={cat}>
                      <td>{cat}</td>
                      <td style={{ textAlign: 'center' }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* SECTION 3: SIGN-OFF SIGNATURES */}
        <div className={styles.printDocSignOffRow}>
          <div className={styles.printDocSignOffCol}>
            <span className={styles.printDocSignOffLabel}>Prepared By:</span>
            <div className={styles.printDocSignOffLine} />
            <span className={styles.printDocSignOffName}>
              {auth.currentUser?.displayName || auth.currentUser?.email || 'System Administrator'}
            </span>
            <span className={styles.printDocSignOffRole}>System Administrator</span>
          </div>
          <div className={styles.printDocSignOffCol}>
            <span className={styles.printDocSignOffLabel}>Approved & Verified By:</span>
            <div className={styles.printDocSignOffLine} />
            <span className={styles.printDocSignOffName}>___________________________________</span>
            <span className={styles.printDocSignOffRole}>Barangay Chairman / Committee Head</span>
          </div>
        </div>
      </div>

      {/* Page Header */}
      {fetchError && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
          <span>{fetchError}</span>
          <button style={{ background: 'none', border: 'none', color: '#b91c1c', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' }} onClick={() => setFetchError(null)}>&times;</button>
        </div>
      )}
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
            Print PDF
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleExportExcel}
            disabled={loading}
          >
            <Download size={18} />
            Download Excel Report
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
            Custom
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
              <span className={styles.metricMainVal}>₱{stats.totalFundraiserRaised.toLocaleString()}</span>
              <span className={styles.metricSubVal}>
                Raised of ₱{stats.totalFundraiserGoal.toLocaleString()} goal ({stats.totalFundraisers} active requests)
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
              className={`${styles.metricCard} ${styles.interactiveCard}`}
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
        <AnimatedModal onClose={() => setShowItemsModal(false)} maxWidth={520}>
          {/* Header Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', padding: '18px 24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#1e293b', fontFamily: 'var(--font, sans-serif)' }}>
              Donated Items Details
            </h3>
            <button
              onClick={() => setShowItemsModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Table Body Content */}
          <div style={{ padding: '0', maxHeight: '60vh', overflowY: 'auto' }}>
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
                return (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', margin: 0, fontSize: '0.95rem' }}>
                    No physical items donated in this timeframe.
                  </p>
                );
              }

              const ITEMS_PER_PAGE = 8; //sample
              const totalItemsPages = Math.ceil(validItems.length / ITEMS_PER_PAGE);
              const paginatedItems = validItems.slice((itemsModalPage - 1) * ITEMS_PER_PAGE, itemsModalPage * ITEMS_PER_PAGE);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: '65%', textAlign: 'left', padding: '12px 24px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Item Name
                        </th>
                        <th style={{ width: '35%', textAlign: 'center', padding: '12px 24px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((itemObj, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfe' }}>
                          {/* Item Description Cell */}
                          <td style={{ width: '65%', padding: '14px 24px', fontSize: '0.9rem', fontWeight: '500', color: '#334155', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: '1.4' }}>
                            {itemObj.item}
                          </td>
                          {/* Clean Badge Value Cell */}
                          <td style={{ width: '35%', padding: '14px 24px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                padding: '4px 12px',
                                borderRadius: '9999px',
                                border: '1px solid #bbf7d0',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                maxWidth: '130px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                verticalAlign: 'middle'
                              }}
                              title={itemObj.quantity}
                            >
                              {itemObj.quantity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Clean Footer Pagination Controls */}
                  {totalItemsPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px 0', borderTop: '1px solid #e2e8f0', background: '#f8fafc', marginTop: 'auto' }}>
                      <button
                        disabled={itemsModalPage === 1}
                        onClick={() => setItemsModalPage(p => Math.max(1, p - 1))}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: itemsModalPage === 1 ? '#f1f5f9' : '#ffffff', color: itemsModalPage === 1 ? '#94a3b8' : '#334155', cursor: itemsModalPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.2s' }}>
                        Prev
                      </button>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Page {itemsModalPage} of {totalItemsPages}</span>
                      <button
                        disabled={itemsModalPage === totalItemsPages}
                        onClick={() => setItemsModalPage(p => Math.min(totalItemsPages, p + 1))}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: itemsModalPage === totalItemsPages ? '#f1f5f9' : '#ffffff', color: itemsModalPage === totalItemsPages ? '#94a3b8' : '#334155', cursor: itemsModalPage === totalItemsPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.2s' }}>
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
