const fs = require('fs');
const file = 'src/pages/CharityEvents.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace("updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'", "updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore'");

// 2. Lifecycle
const lifecycleRegex = /\/\*\s*--\s*Fetch Approved Events\s*--\s*\*\/.*?return \(\) => unsub\(\);\s*\}, \[\]\);/s;
const lifecycleReplacement = `  /* -- Fetch Approved Events -- */
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'charity_events'),
      where('approvalStatus', '==', 'Approved'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* -- Event Lifecycle Updates -- */
  useEffect(() => {
    if (events.length === 0) return;

    const updateEventStatuses = async () => {
      const now = new Date();
      const batch = writeBatch(db);
      let hasChanges = false;

      for (const ev of events) {
        if (!ev.date || !ev.startTime || !ev.endTime) continue;
        const startStr = \`\${ev.date}T\${ev.startTime}\`;
        const endStr = \`\${ev.date}T\${ev.endTime}\`;
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start) || isNaN(end)) continue;

        let updates = {};

        if (ev.status === 'Upcoming' && now >= start && now <= end) {
          updates.status = 'Ongoing';
          hasChanges = true;
        }

        if (ev.status !== 'Completed' && now > end) {
          updates.status = 'Completed';
          hasChanges = true;

          if (ev.organizerId) {
            const notifRef = collection(db, \`users/\${ev.organizerId}/notifications\`);
            addDoc(notifRef, {
              title: "Action Required: Submit Event Report",
              body: \`Your event "\${ev.title || 'Untitled'}" has concluded. Please submit a post-event report or documentation for transparency.\`,
              type: "Event",
              notifSubtype: "event_report_request",
              status: "warning", 
              read: false,
              createdAt: serverTimestamp(),
              eventId: ev.id,
              eventTitle: ev.title,
              requiresAction: true 
            }).catch(err => console.error("Report notification failed:", err));
            
            addDoc(collection(db, "audit_logs"), {
              adminName: "System System",
              role: "Automated Service",
              actionType: "Auto-Moderation",
              actionDetails: \`Automatically concluded event.\`,
              targetName: ev.title || "Untitled",
              eventLifecycle: ev.status || "Upcoming",
              status: "Success",
              timestamp: serverTimestamp(),
              type: "event" 
            }).catch(err => console.error("Audit log failed:", err));
          }
        }

        if (Object.keys(updates).length > 0) {
          const eventRef = doc(db, "charity_events", ev.id);
          batch.update(eventRef, updates);
        }
      }

      if (hasChanges) {
        try {
          await batch.commit();
        } catch (err) {
          console.error("Batch update failed:", err);
        }
      }
    };

    const timer = setTimeout(updateEventStatuses, 1000); 
    return () => clearTimeout(timer);
  }, [events]);`;

content = content.replace(lifecycleRegex, lifecycleReplacement);

// 3. Join logic
content = content.replace(
  "    const participantList = selectedEvent.anticipatedParticipants || [];",
  "    if (selectedEvent?.status === 'Ongoing') {\n      await showAlert(`This event is already ongoing. You cannot join or leave it now.`);\n      return;\n    }\n\n    const participantList = selectedEvent.anticipatedParticipants || [];"
);

// 4. Status prop to card
content = content.replace(
  "                  isJoined={currentUserJoined(ev)}\n                  isOrganized={auth.currentUser?.uid === ev.organizerId}\n                />",
  "                  isJoined={currentUserJoined(ev)}\n                  isOrganized={auth.currentUser?.uid === ev.organizerId}\n                  status={ev.status}\n                />"
);

fs.writeFileSync(file, content);
console.log("Updated CharityEvents.jsx successfully.");
