
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateProjectBriefPDF = (data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // Helper to add centered text
    const addCenteredText = (text: string, fontSize: number, fontStyle: string = 'normal', color: [number, number, number] = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.setTextColor(color[0], color[1], color[2]);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, currentY);
        currentY += fontSize / 2 + 5;
    };

    // Helper to add heading
    const addHeading = (text: string) => {
        if (currentY > 260) {
            doc.addPage();
            currentY = 20;
        }
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(126, 34, 206); // Purple-700
        doc.text(text, 20, currentY);
        currentY += 10;
        doc.setDrawColor(226, 232, 240);
        doc.line(20, currentY - 2, pageWidth - 20, currentY - 2);
        currentY += 5;
    };

    // Helper to add body text
    const addBodyText = (text: string) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const splitText = doc.splitTextToSize(text, pageWidth - 40);
        doc.text(splitText, 20, currentY);
        currentY += (splitText.length * 6) + 5;
    };

    // Helper to add list item
    const addListItem = (text: string) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('•', 25, currentY);
        const splitText = doc.splitTextToSize(text, pageWidth - 55);
        doc.text(splitText, 32, currentY);
        currentY += (splitText.length * 5) + 3;
    };

    // --- Start Building PDF ---

    // Title Section
    addCenteredText('PROJECT BRIEF', 10, 'bold', [100, 116, 139]);
    addCenteredText('Outpouring Convention & Episcopal Consecration', 22, 'bold', [30, 41, 59]);

    currentY += 5;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(20, currentY, pageWidth - 40, 25, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Status:', 30, currentY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text('In Progress', 50, currentY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('Timing:', 30, currentY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 50, currentY + 18);

    currentY += 35;

    // Overview
    addHeading('Overview');
    addBodyText('This brief contains a high-level summary of the project management of the forthcoming Outpouring Convention & Episcopal Consecration.');

    // Immediate Actions
    addHeading('Immediate Actions');
    const immediateActions = [
        'Formation of Intercessory Unit',
        'National Organising Committee Meeting',
        'Creation of the Official Flyer & ‘Save the Date’ Content Creation',
        'Formation of Invitation Scripting, Design & Content Unit',
        'Formation of Flights, Accommodation, Transportation & Hospitality Unit'
    ];
    immediateActions.forEach(action => addListItem(action));
    currentY += 5;

    // Subsequent Units
    addHeading('Subsequent Units');
    currentY += 5;
    const subsequentUnits = [
        { name: 'Formation of Pastoral Care Unit', desc: 'tasked with the procurement of all that is required for the Bishop Elect. To serve as Personal Assistants responsible for the schedule, care, accommodation, transportation, hospitality etc. of the Bishop Elect during the program.' },
        { name: 'Formation of Usher & Protocol Unit', desc: 'tasked with the service of all incoming Bishops, Pastors, Government Officials, Incoming Music Ministers and other dignitaries present during the program.' },
        { name: 'Formation of Property Acquiring Unit', desc: 'tasked with the search, viewing and negotiation of the new TPH owned property ahead of the Ordination.' },
        { name: 'Formation of Management & Administrative Unit', desc: 'tasked with the sole responsibility to ensure that all other units are compliant with the Project Management Plan, are meeting deadlines and operating efficiently. Ensuring that all Units are working together seamlessly to ensure a smooth running of the program.' }
    ];
    subsequentUnits.forEach(unit => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59); // Slate-900 (Reset from purple heading)
        doc.text(`• ${unit.name}:`, 25, currentY);
        currentY += 6;

        const splitDesc = doc.splitTextToSize(unit.desc, pageWidth - 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // Slate-700
        doc.text(splitDesc, 32, currentY);
        currentY += (splitDesc.length * 5) + 8; // Increased spacing from +4 to +8

        if (currentY > 270) {
            doc.addPage();
            currentY = 20;
        }
    });

    // Already Existing Units
    addHeading('Already Existing Units');
    const existing = [
        'Children’s Department',
        'National Organising Committee',
        'National TPH Choir',
        'TPH National Pastoral Team',
        'TPH Headquarters Pastoral Team'
    ];
    existing.forEach(item => addListItem(item));
    currentY += 5;

    // Unit Formation Plan
    addHeading('Unit Formation');
    addBodyText('Unit Formation Plan: National Workers Meeting held. Before this time a list of all Units is given to each of the main Pastors. Pastors nominate different members and workers into groups they see fit. During the meeting everyone is informed by their Pastor what unit they will be joining and who the unit lead will be. This ensures a blended approach and maximum collaboration.');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('This section is to take note of all the Units, the Unit Leads and who from what branch is in what Unit.', 20, currentY);
    currentY += 8;

    autoTable(doc, {
        startY: currentY,
        head: [['Role', 'Name', 'Members']],
        body: [
            ['Lead(s)', 'Person', 'Person, Person'],
            ['Reporters', 'Person', 'Person, Person, Person'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [126, 34, 206] },
        margin: { left: 20, right: 20 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // To Do List
    addHeading('To Do List / Checklist');

    const checklists = [
        {
            unit: 'Invitation Scripting, Design & Content Unit',
            tasks: ['Invitations to Bishops', 'Invitations to the Pastors all around Ireland', 'Invitations to Government functionaries, President, Governors, Mayors', 'Invitations to go with flyers', 'Designing of Ordination Program']
        },
        {
            unit: 'Formation of Management & Administrative Unit',
            tasks: ['Printing of Flyers & Leaflets', 'Printing of Ordination Program']
        },
        {
            unit: 'Formation of Pastoral Care Unit',
            tasks: ['Purchasing of Bishopric Robes', 'Purchasing of Bishopric Books', 'Selecting a designate to assist Bishop Elect with the wearing of robes on the day of program', 'Creation of Schedule for Bishop Elect from 14th - 16th August 2026.']
        }
    ];

    checklists.forEach(list => {
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(list.unit + ':', 20, currentY);
        currentY += 7;
        list.tasks.forEach(task => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('[ ] ' + task, 25, currentY);
            currentY += 6;
            if (currentY > 275) {
                doc.addPage();
                currentY = 20;
            }
        });
        currentY += 5;
    });

    // Deadlines
    addHeading('Deadlines');
    addBodyText('Management & Administrative Unit Responsible for setting Deadlines to ensure we progress swiftly from one phase to the next.');

    autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Deadline', 'Description', 'Expected Outcome']],
        body: [
            ['Date', 'Deadline 1', 'Invitations Drafted', 'First Draft scripted and designed'],
            ['Date', 'Deadline 2', 'Invitations Reviewed & Amended', 'Reviewed and Approved/Amended'],
            ['Date', 'Deadline 3', 'Invitations Sent', 'Posted/Emailed/Sent by this date'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [126, 34, 206] },
        margin: { left: 20, right: 20 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Phases
    addHeading('Phases');
    doc.setFontSize(10);
    const phases = [
        'Phase I: Jan - Mar',
        'Phase II: Mar - May',
        'Phase III: May - July'
    ];
    phases.forEach(p => addListItem(p));

    currentY += 5;
    addBodyText('All tasks to be completed are divided into each Phase in order of priority and urgency. Heavy lifting between Phase I and Phase II, Phase III Final Preparations and Constant Prayers.');

    // Open PDF in new tab
    const pdfData = doc.output('bloburl');
    window.open(pdfData, '_blank');
};
