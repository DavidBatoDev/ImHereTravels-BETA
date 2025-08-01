Below is a “column‑by‑column tour” of the *ImHere Travels – Booking & Inquiry Mgt.* Main Dashboard file. 
For each field I note  1) what it stores/means,  2) how the value is created (manual entry, data‑validation pick‑list, formula, or automation), and  3) what other columns depend on it.

---

### 1  Core booking facts (left‑most part of the sheet)

| Col     | Name                  | What it is & how it’s filled                                                                                   | Who/what uses it                                          |                           |                                                                                    |
| ------- | --------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| *A*   | *Booking ID*        | Your master key (e.g. TR-EC-20250712-JD-01). Comes from the web form / Zapier import, and *never changes*. | Everything downstream VLOOKUPs on this.                   |                           |                                                                                    |
| *G*   | *Email Address*     | Traveller’s main e‑mail. Imported, so read‑only in Main Dashboard.                                             | Comms merge tags, Gmail‑draft URL, payment reminders.     |                           |                                                                                    |
| *H‑I* | *First / Last Name* | Same as above.                                                                                                 | Full‑name merge, subject line, reminder text.             |                           |                                                                                    |
| *K*   | *Reservation Date*  | Date the booking was captured (imported; stored as an Excel date).                                             | Cut‑offs for full‑payment bookings (due 48 h after this). |                           |                                                                                    |
| *L*   | *Booking Type*      | Pick‑list \`single                                                                                             | duo                                                       | group\`. Chosen by agent. | Determines if *U Is Main Booker* shows, and how *V/W Group ID* are calculated. |
| *M*   | *Tour Package Name* | Drop‑down of 12 named packages (driven off a hidden “Tour Packages” sheet).                                    | Used for price look‑ups (AF/AG) and all e‑mail text.      |                           |                                                                                    |
| *N*   | *Tour Date*         | Departure date. Manual or calendar picker.                                                                     | Payment‑plan due dates (instalments, full balance).       |                           |                                                                                    |

---

### 2  Payment‑terms engine

| Col    | Name                          | What it is & rules                                                                                                                                                                                   | Feeds                                                                                         |                                                       |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| *T*  | *Available Payment Terms*   | Agent chooses from: Invalid (quote only) / *Full Payment required within 48 hrs* / *P1‑P4* (instalment codes).                                                                                 | Drives *AJ Payment Plan*, *AL Enable Payment Reminder*, plus instalment schedule (AO→BZ). |                                                       |
| *U*  | *Is Main Booker*            | TRUE if this traveller is the payor in a duo/group. A data‑validation rule allows only 1 TRUE per *Group ID*.                                                                                      | Prevents duplicate reminders – only main booker receives them.                                |                                                       |
| *V*  | *Group ID Generator*        | Hidden helper formula: builds an incremental two‑ or three‑digit counter per Booking ID, e.g. 001, 002….                                                                                           | Next column.                                                                                  |                                                       |
| *W*  | *Group ID*                  | =IF(L="single",BookingID,Vlookup(BookingID,{A:V},22,0)) – every passenger in the same party shares one ID.                                                                                         | Bulk filters, group revenue, and one‑to‑many reminders.                                       |                                                       |
| *AF* | *Original Tour Cost*        | Formula looks up today’s sell price for the selected package. Source table lives on Tour Pricing History.                                                                                          | Baseline for fees, discounts, remaining balance.                                              |                                                       |
| *AG* | *Discounted Tour Cost*      | Shows only when *Y Use Discounted Tour Cost* is TRUE: =AF*(1‑discount%).                                                                                                                         | Same downstream as AF (mutually exclusive).                                                   |                                                       |
| *AH* | *Reservation Fee*           | Default 15 % of whichever cost (AF/AG) is active. Over‑writeable if a special deposit applies.                                                                                                       | Remaining balance.                                                                            |                                                       |
| *AI* | *Remaining Balance*         | =(IF(Y,AG,AF)-AH) – Σ payments actually logged. Updates automatically when instalment amounts are marked paid.                                                                                     | Late‑balance conditional formatting; reminder merge‑tag.                                      |                                                       |
| *AJ* | *Payment Plan*              | A clean descriptor – either Full Payment or a copy of the instalment code (P1…P4). Calculated off column T.                                                                                        | Calendar invites, reminder routing logic.                                                     |                                                       |
| *AK* | *Payment Method*            | Pick‑list \`stripe                                                                                                                                                                                   | revolut\`. You can pre‑fill from the payment link actually used via Zapier.                   | Tells the follow‑up e‑mails which pay‑button to show. |
| *AL* | *Enable Payment Reminder*   | Checkbox formula: TRUE when (AI > 0) *and* plan ≠ Full. Manually un‑tick to suppress reminders.                                                                                                    | Turns on the “Set Reminder” hyperlink (AM).                                                   |                                                       |
| *AM* | *Set Initial Reminder Link* | A dynamic HYPERLINK that opens a pre‑filled Google Calendar event exactly *1 week before AN Full‑Payment Due Date*. Appears only when AL is TRUE.                                                  | Agent clicks it once; Calendar does the rest.                                                 |                                                       |
| *AN* | *Full Payment Due Date*     | Logic sample: =IF(AJ="Full Payment", K+2, N-14) – so full‑pay bookings are due 48 h after reservation; instalment plans are due 14 days before departure. Editable if Finance grants an extension. |                                                                                               |                                                       |

(Columns **AO → BZ* then hold the four‑instalment grid: Scheduled Reminder Date, Calendar ID, Link, Due Date, Amount, Date Paid – repeated for P1‑P4. Their formulas reference AI, AN and a % split table.)*

---

### 3  Comms automation

| Col    | Name                            | Purpose & mechanics                                                                                                                                                              | Depends on                                                                                |
| ------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| *X*  | *Include BCC (Reservation)*   | Checkbox. If TRUE the auto‑compose URL adds bcc=reservations@imheretravels.com.                                                                                                | AA Email Draft Link.                                                                      |
| *Y*  | *Use Discounted Tour Cost*    | Checkbox to signal a promo or loyalty rate. When TRUE, AG overrides AF everywhere.                                                                                               | AG, AH, AI, all e‑mails.                                                                  |
| *Z*  | *Generate Email Draft*        | Checkbox the agent flips when everything else looks good.                                                                                                                        | Drives visibility of *AA Email Draft Link* so the draft isn’t created prematurely.      |
| *AA* | *Email Draft Link*            | HYPERLINK formula that crafts a Gmail “compose” URL: fills To, (optional) Bcc, Subject, and a templated body quoting deposit and balance. Click = opens a ready‑to‑send message. | X, Z, G, H, M, N, AH, AI, AN.                                                             |
| *AB* | *Subject Line (Reservation)*  | Auto‑generated text such as “Your Island‑Hopping Classic booking – 12 Aug”. You can over‑type for a custom line.                                                               | AA.                                                                                       |
| *AC* | *Send Email*                  | Checkbox you tick after hitting Send in Gmail.                                                                                                                                   | Conditional formatting turns row green; next script can pick these up to write *AD/AE*. |
| *AD* | *Sent Email Link*             | Zapier or the Gmail‑to‑Sheets add‑on pastes in the URL of the actual sent message for audit.                                                                                     | —                                                                                         |
| *AE* | *Reservation Email Sent Date* | Time‑stamp from the same add‑on so you can measure response SLAs.                                                                                                                | —                                                                                         |

---

### 4  Pricing & settlement maths

| Col    | Meaning                     | Typical formula / behaviour                          |
| ------ | --------------------------- | ---------------------------------------------------- |
| *AF* | Published tour cost today   | =VLOOKUP(M,'Tour Pricing History'!A:D,4,0)         |
| *AG* | Discounted cost if Y=TRUE   | =IF(Y,AF*(1‑discount%),"")                         |
| *AH* | Deposit payable within 48 h | =ROUND((IF(Y,AG,AF))*0.15,0)                       |
| *AI* | Balance still due           | =IF(AH="","",IF(Y,AG,AF)-AH-SUM(instalments paid)) |

(Instalment amounts in AO‑BZ are simply **AI × split percentage*; “Date Paid” cells clear the Remaining Balance math.)*

---

### 5  Typical workflow the sheet supports

1. *Booking arrives* via form → row appears with columns A, G‑N, T pre‑filled.
2. Agent picks *Booking Type* and (if required) sets *Is Main Booker*.
3. Pricing formulas (AF‑AI) calculate deposit & balance instantly.
4. Tick *Use Discounted Tour Cost* if a promo applies → numbers refresh.
5. Review *Full Payment Due Date* (AN); override only in edge cases.
6. Tick *Generate Email Draft* → AA link lights up → click it, edit e‑mail, send.
7. Tick *Send Email* → row turns green; Gmail add‑on later back‑fills AD/AE.
8. If instalments: leave *Enable Payment Reminder* ticked → click *Set Initial Reminder* to add a Calendar event; the same event fires mails at each instalment date.
9. As payments land, mark “Date Paid” in the relevant P‑column; *Remaining Balance* drops until £0.
10. Filters/conditional formats flag any booking whose Tour Date < today
*and*
Remaining Balance > 0 so Finance can chase.

---

*That’s it!*
Every column is either a key, a setting the agent toggles, or a computed helper that keeps bookings, payments, and e‑mails in perfect sync. 

# Appscript codes:
### appscript.json:
{
  "timeZone": "Asia/Manila",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Gmail",
        "version": "v1",
        "serviceId": "gmail"
      },
      {
        "userSymbol": "Sheets",
        "version": "v4",
        "serviceId": "sheets"
      },
      {
        "userSymbol": "Calendar",
        "version": "v3",
        "serviceId": "calendar"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "oauthScopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents"
  ],
  "runtimeVersion": "V8"
}

### reservationEmailMain.gs:
function onEdit(e) {
// simple triggers run in AuthMode.NONE, installables in FULL
  if (e.authMode !== ScriptApp.AuthMode.FULL) {
    console.log('Skipping simple trigger - waiting for installable trigger');
    return;
  }

  // 1) handle all of your “main” dashboard edits
  try {
    onEditMain(e);
  } catch (err) {
    console.error('onEditMain error:', err);
  }

  // 2) handle sendPaymentReminder.gs
  try {
    onEditEnableMonthlyReminder(e);
  } catch (err) {
    console.error("Error in onEditEnableMonthlyReminder:", err);
  }

  // 3) handle Adventure Kit dashboard edits
  try {
    onEditAdventureKit(e);
  } catch (err) {
    console.error('onEditAdventureKit error:', err);
  }  
}

function onEditMain(e) {
  const sheet = e.source.getSheetByName("Main Dashboard");
  if (!sheet) return;

  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();
  const headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];

  const generateDraftCol = headers.indexOf("Generate Email Draft") + 1; // Generation of Reservation Email
  const sendEmailCol = headers.indexOf("Send Email?") + 1;

  if (col === generateDraftCol && e.value === "TRUE") {
    generateSingleEmailDraft(row); // Regular scenarios
  }

  if (col === sendEmailCol && e.value === "TRUE") {
    sendFinalEmail(row);
  }

  const cancelDraftCol = headers.indexOf("Generate Cancellation Email Draft") + 1; // Generation of Cancellation Email
  const cancelSendCol = headers.indexOf("Send Cancellation Email?") + 1;

  if (col === cancelDraftCol && e.value === "TRUE") {
    generateCancellationEmailDraft(row); // For cancelled bookings
  }

  if (col === cancelSendCol && e.value === "TRUE") {
    sendFinalEmail(row);
  }
}

function formatGBP(value) {
  return value ? £${Number(value).toFixed(2)} : "";
}

function getSubjectLine(availablePaymentTerms, fullName, tourPackage, isCancelled) {
  switch (availablePaymentTerms) {
    case "Invalid":
      return "Action Required: Issue with your Booking - Please Review";
    case "Full payment required within 48hrs":
      return Action Required: Complete your Booking for ${tourPackage};
    case "P1":
      return Hi ${fullName}, Complete your Booking for ${tourPackage};
    case "P2":
      return "Choose a Payment Plan to Confirm your Tour";
    case "P3":
    case "P4":
      return Confirm your Spot on ${tourPackage} with a Flexible Payment Plan;
    default:
      return "Booking Confirmation: Please Review your Details";
  }
}

function getBCCList() {
  const bccSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("{INDEX} BCC Users");
  const bccList = bccSheet.getRange("A5:A").getValues().flat().filter(e => e);
  return bccList.join(',');
}

function getMainBookerByGroupId(groupId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main Dashboard");
  const headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getDataRange().getValues();

  const groupIdCol = headers.indexOf("Group ID");
  const isMainBookerCol = headers.indexOf("Is Main Booker?");
  const firstNameCol = headers.indexOf("First Name");
  const lastNameCol = headers.indexOf("Last Name");

  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (row[groupIdCol] === groupId && row[isMainBookerCol] === true) {
      return ${row[firstNameCol]} ${row[lastNameCol]};
    }
  }
  return null;
}

function generateSingleEmailDraft(rowNum) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main Dashboard");
  const headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];

  // ✅ Trim and check email
  let email = data[headers.indexOf("Email Address")];
  email = email ? email.trim() : "";

  const draftLinkCol = headers.indexOf("Email Draft Link");
  const generateDraftCol = headers.indexOf("Generate Email Draft");
  const reservationSubjectLineCol = headers.indexOf("Subject Line (Reservation)"); // ✅ NEW
  

  if (!email || !email.includes("@")) {
    sheet.getRange(rowNum, draftLinkCol + 1).setValue(ERROR: Invalid email: "${email}");
    sheet.getRange(rowNum, generateDraftCol + 1).setValue(false);
    return;
  }
  const recipient = email;
  const fullName = data[headers.indexOf("Full Name")];
  const bookingId = data[headers.indexOf("Booking ID")];
  const groupId = data[headers.indexOf("Group ID")];
  const tourPackage = data[headers.indexOf("Tour Package Name")];
  const tourDateRaw = new Date(data[headers.indexOf("Tour Date")]);
  const returnDateRaw = new Date(data[headers.indexOf("Return Date")]);
  const tourDuration = data[headers.indexOf("Tour Duration")];
  const bookingType = data[headers.indexOf("Booking Type")];
  const reservationFee = data[headers.indexOf("Reservation Fee")];
  const remainingBalance = data[headers.indexOf("Remaining Balance")];
  const fullPaymentAmount = data[headers.indexOf("Full Payment Amount")];
  const fullPaymentDueDate = data[headers.indexOf("Full Payment Due Date")];
  const p1Amount = data[headers.indexOf("P1 Amount")];
  const p1DueDate = data[headers.indexOf("P1 Due Date")];
  const p2Amount = data[headers.indexOf("P2 Amount")];
  const p2DueDate = data[headers.indexOf("P2 Due Date")];
  const p3Amount = data[headers.indexOf("P3 Amount")];
  const p3DueDate = data[headers.indexOf("P3 Due Date")];
  const p4Amount = data[headers.indexOf("P4 Amount")];
  const p4DueDate = data[headers.indexOf("P4 Due Date")];
  const availablePaymentTerms = data[headers.indexOf("Available Payment Terms")];

  const subject = getSubjectLine(availablePaymentTerms, fullName, tourPackage);

  const template = HtmlService.createTemplateFromFile("reservationEmailTemplate");

  template.fullName = fullName;
  template.mainBooker = (bookingType === "Group Booking" || bookingType === "Duo Booking")
    ? getMainBookerByGroupId(groupId) || fullName
    : fullName;
  template.tourPackage = tourPackage;
  template.tourDate = Utilities.formatDate(tourDateRaw, Session.getScriptTimeZone(), "yyyy-MM-dd");
  template.returnDate = Utilities.formatDate(returnDateRaw, Session.getScriptTimeZone(), "yyyy-MM-dd");
  template.availablePaymentTerms = availablePaymentTerms;
  template.tourDuration = tourDuration;
  template.bookingType = bookingType;
  template.bookingId = bookingId;
  template.groupId = groupId;
  template.reservationFee = reservationFee;
  template.remainingBalance = remainingBalance;
  template.fullPaymentAmount = formatGBP(fullPaymentAmount);
  template.fullPaymentDueDate = fullPaymentDueDate;
  template.p1Amount = formatGBP(p1Amount);
  template.p1DueDate = p1DueDate;
  template.p2Amount = formatGBP(p2Amount);
  template.p2DueDate = p2DueDate;
  template.p3Amount = formatGBP(p3Amount);
  template.p3DueDate = p3DueDate;
  template.p4Amount = formatGBP(p4Amount);
  template.p4DueDate = p4DueDate;

  const includeBCC = data[headers.indexOf("Include BCC (Reservation)")];
  const bccList = includeBCC ? getBCCList() : '';
  const htmlBody = template.evaluate().getContent();

  const draftThreads = GmailApp.search(in:drafts to:${recipient} subject:"${subject}");
  Logger.log(Found ${draftThreads.length} matching draft(s) for ${recipient});
  if (draftThreads.length > 0) {
    SpreadsheetApp.getUi().alert(
      A draft with the same recipient (${recipient}) and subject ("${subject}") already exists.\n\nPlease delete it manually from Gmail before generating a new one.
    );

    // Uncheck "Generate Email Draft"
    sheet.getRange(rowNum, generateDraftCol + 1).setValue(false);
    return; // Exit early to prevent duplicate
  }

  const draft = GmailApp.createDraft(recipient, subject, '', {
    htmlBody: htmlBody,
    bcc: bccList,
    from: "Bella | ImHereTravels <bella@imheretravels.com>" // ✅ your verified alias
  });
  const msgId = draft.getMessageId();
  const composeUrl = https://mail.google.com/mail/u/0/#drafts?compose=${msgId};
  const safeFormula = =HYPERLINK("${composeUrl}", "View Draft");

  sheet.getRange(rowNum, draftLinkCol + 1).setFormula(safeFormula);
  sheet.getRange(rowNum, generateDraftCol + 1).setValue(false);

  if (reservationSubjectLineCol !== -1) {
    sheet.getRange(rowNum, reservationSubjectLineCol + 1).setValue(subject); // ✅ Write subject
  }
}

function generateCancellationEmailDraft(rowNum) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main Dashboard");
  const headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];

  let email = data[headers.indexOf("Email Address")];
  email = email ? email.trim() : "";

  const draftLinkCol = headers.indexOf("Cancellation Email Draft Link");
  const generateDraftCol = headers.indexOf("Generate Cancellation Email Draft");

  if (!email || !email.includes("@")) {
    sheet.getRange(rowNum, draftLinkCol + 1).setValue(ERROR: Invalid email: "${email}");
    sheet.getRange(rowNum, generateDraftCol + 1).setValue(false);
    return;
  }

  const fullName = data[headers.indexOf("Full Name")];
  const tourPackage = data[headers.indexOf("Tour Package Name")];
  const tourDateRaw = new Date(data[headers.indexOf("Tour Date")]);
  const reservationFee = data[headers.indexOf("Reservation Fee")];

  const cancelledRefundAmount = formatGBP(reservationFee);
  const tourDate = Utilities.formatDate(tourDateRaw, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const subject = Important Update: Your ${tourPackage} has been Cancelled;

  // ✅ Set subject line in sheet
  const cancelSubjectLineCol = headers.indexOf("Subject Line (Cancellation)");
  if (cancelSubjectLineCol !== -1) {
    sheet.getRange(rowNum, cancelSubjectLineCol + 1).setValue(subject);
  }

  // ✅ Check for existing draft with same recipient and subject
  const draftThreads = GmailApp.search(in:drafts to:${email} subject:"${subject}");
  Logger.log(Found ${draftThreads.length} matching cancellation draft(s) for ${email});
  if (draftThreads.length > 0) {
    SpreadsheetApp.getUi().alert(
      A draft with the same recipient (${email}) and subject ("${subject}") already exists.\n\nPlease delete it manually from Gmail before generating a new one.
    );

    // ✅ Uncheck the box after showing the prompt
    sheet.getRange(rowNum, generateDraftCol + 1).setValue(false);
    return;
  }

  const template = HtmlService.createTemplateFromFile("cancellationEmailTemplate");
  template.fullName = fullName;
  template.tourPackage = tourPackage;
  template.tourDate = tourDate;
  template.cancelledRefundAmount = cancelledRefundAmount;
  template.isCancelled = true;

  const includeBCC = data[headers.indexOf("Include BCC (Cancellation)")];
  const bccList = includeBCC ? getBCCList() : '';
  const htmlBody = template.evaluate().getContent();

  const draft = GmailApp.createDraft(email, subject, '', {
    htmlBody: htmlBody,
    bcc: bccList,
    from: "Bella | ImHereTravels <bella@imheretravels.com>"
  });

  const msgId = draft.getMessageId();
  const composeUrl = https://mail.google.com/mail/u/0/#drafts?compose=${msgId};
  const safeFormula = =HYPERLINK("${composeUrl}", "View Draft");

  sheet.getRange(rowNum, draftLinkCol + 1).setFormula(safeFormula);
  sheet.getRange(rowNum, generateDraftCol + 1).setValue(false);
}



function sendFinalEmail(rowNum) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Main Dashboard");
  const headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];

  const normalDraftLinkCol = headers.indexOf("Email Draft Link");
  const cancelDraftLinkCol = headers.indexOf("Cancellation Email Draft Link");
  const sendEmailCol = headers.indexOf("Send Email?");
  const sendCancelCol = headers.indexOf("Send Cancellation Email?");
  const sentLinkCol = headers.indexOf("Sent Email Link");
  const sentCancelLinkCol = headers.indexOf("Sent Cancellation Email Link");
  const reservationSubjectLineCol = headers.indexOf("Subject Line (Reservation)");
  const dateCol = headers.indexOf("Reservation Email Sent Date");
  const cancelDateCol = headers.indexOf("Cancellation Email Sent Date");

  const availablePaymentTerms = data[headers.indexOf("Available Payment Terms")];
  const reasonForCancellation = data[headers.indexOf("Reason for Cancellation")];
  const cancelSubjectLineCol = headers.indexOf("Subject Line (Cancellation)");

  let draftLinkColToUse, sendColToUse, sentLinkColToUse, dateColToUse;
  if (availablePaymentTerms === "Cancelled" || reasonForCancellation) {
    draftLinkColToUse = cancelDraftLinkCol;
    sendColToUse = sendCancelCol;
    sentLinkColToUse = sentCancelLinkCol;
    dateColToUse = cancelDateCol;
  } else {
    draftLinkColToUse = normalDraftLinkCol;
    sendColToUse = sendEmailCol;
    sentLinkColToUse = sentLinkCol;
    dateColToUse = dateCol;
  }

  const email = (data[headers.indexOf("Email Address")] || "").trim();
  const subject = (availablePaymentTerms === "Cancelled" || reasonForCancellation)
    ? (data[cancelSubjectLineCol] || "")
    : (data[reservationSubjectLineCol] || "");

  if (!email.includes("@")) {
    sheet.getRange(rowNum, sentLinkColToUse + 1).setValue(ERROR: Invalid email: "${email}");
    sheet.getRange(rowNum, sendColToUse + 1).setValue(false);
    return;
  }

  try {
    const threads = GmailApp.search(in:drafts to:(${email}) subject:"${subject}");
    if (threads.length === 0) throw new Error("Draft not found. Please confirm subject/recipient.");

    const messages = threads[0].getMessages();
    const draftMsg = messages.find(msg => !msg.isDraft() === false);
    if (!draftMsg) throw new Error("Matching draft not found.");

    const draft = GmailApp.getDrafts().find(d =>
      d.getMessage().getTo() === email &&
      d.getMessage().getSubject() === subject
    );

    if (!draft) throw new Error("Draft not found in drafts.");

    draft.send();

    Utilities.sleep(1500); // Let Gmail update its Sent folder

    const sentThreads = GmailApp.search(in:sent to:(${email}) subject:"${subject}");
    const sentMsgId = sentThreads.length
      ? sentThreads[0].getMessages()[0].getId()
      : null;

    const sentUrl = sentMsgId
      ? https://mail.google.com/mail/u/0/#sent/${sentMsgId}
      : https://mail.google.com/mail/u/0/#sent;

    // Clear draft link
    sheet.getRange(rowNum, draftLinkColToUse + 1).clearContent();

    // Log sent info
    sheet.getRange(rowNum, sentLinkColToUse + 1).setFormula(=HYPERLINK("${sentUrl}", "View Email"));
    sheet.getRange(rowNum, dateColToUse + 1).setValue(new Date());
    sheet.getRange(rowNum, sendColToUse + 1).setValue(false);

  } catch (error) {
    sheet.getRange(rowNum, sentLinkColToUse + 1).setValue(ERROR: ${error.message});
    sheet.getRange(rowNum, sendColToUse + 1).setValue(false);
    Logger.log("❌ Error in sendFinalEmail: " + error.message);
  }
}


### sendAdventureKit.gs:
function safeMakeCopy(file, name, folder) {
  const MAX_ATTEMPTS = 3;
  const WAIT_MS      = 500;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      return file.makeCopy(name, folder);
    } catch (e) {
      if (i === MAX_ATTEMPTS - 1) throw e;
      Utilities.sleep(WAIT_MS);
    }
  }
}

function onEditAdventureKit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Adventure Kit Dashboard') return;

  const HEADER_ROW   = 3;
  const lastCol      = sheet.getLastColumn();
  const headers      = sheet
    .getRange(HEADER_ROW, 1, 1, lastCol)
    .getValues()[0];

  const genColIndex  = headers.indexOf('Generate Email with Adventure Kit Draft') + 1;
  const sendColIndex = headers.indexOf('Send Email?') + 1;

  const editedCol = e.range.getColumn();
  const row       = e.range.getRow();
  const newVal    = e.range.getValue();

  // ticked “Generate Email…”
  if (editedCol === genColIndex  && newVal === true) {
    generateAdventureKitDraft(sheet, row, headers);
  }
  // ticked “Send Email?”
  if (editedCol === sendColIndex && newVal === true) {
    sendAdventureKitDraft(sheet, row, headers);
  }
}

function updateDraftCell(sheet, row, headers, colName, value) {
  const idx = headers.indexOf(colName);
  if (idx === -1) throw new Error(Header "${colName}" not found.);
  sheet.getRange(row, idx + 1).setValue(value);
}

function generateAdventureKitDraft(sheet, row, headers) {
  // 1) debug: see exactly what your Adventure Kit headers are
  console.log("🔥 Adventure‐Kit Dashboard headers:", JSON.stringify(headers));

  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const packageSheet = ss.getSheetByName("{INDEX} Tour Packages");
  const bccSheet     = ss.getSheetByName("{INDEX} BCC Users");

  // 2) pull in your package‐sheet headers (row 4)
  const packageHeaders = packageSheet
    .getRange(4, 1, 1, packageSheet.getLastColumn())
    .getValues()[0];

  // 3) normalize both header sets once
  const cleanHeaders        = headers.map(h => h.toString().trim().toLowerCase());
  const cleanPackageHeaders = packageHeaders.map(h => h.toString().trim().toLowerCase());

  // 4) robust lookup helpers
  function col(name) {
    const target = name.trim().toLowerCase();
    const idx    = cleanHeaders.indexOf(target);
    if (idx < 0) {
      throw new Error(
        Could not find Adventure Kit header "${name}".\n +
        Available: ${headers.join(" | ")}
      );
    }
    return idx + 1;
  }
  function colPackage(name) {
    const target = name.trim().toLowerCase();
    const idx    = cleanPackageHeaders.indexOf(target);
    if (idx < 0) {
      throw new Error(
        Could not find Package header "${name}".\n +
        Available: ${packageHeaders.join(" | ")}
      );
    }
    return idx + 1;
  }

  // 5) now safely pull all your Dashboard values
  const emailAddress       = sheet.getRange(row, col("Email Address")).getValue();
  const fullName           = sheet.getRange(row, col("Full Name")).getValue();
  const tourPackageName    = sheet.getRange(row, col("Tour Package Name")).getValue();
  const gender             = sheet.getRange(row, col("Gender")).getValue();
  const bookingRef         = sheet.getRange(row, col("Booking Reference")).getValue();

  const flightRoute1       = sheet.getRange(row, col("Flight Route 1")).getValue();
  const airline1           = sheet.getRange(row, col("Airline 1")).getValue();
  const flightNo1          = sheet.getRange(row, col("Flight No. 1")).getValue();
  const departureDatetime1 = sheet.getRange(row, col("Departure Date/Time 1")).getValue();

  const flightRoute2       = sheet.getRange(row, col("Flight Route 2")).getValue();
  const airline2           = sheet.getRange(row, col("Airline 2")).getValue();
  const flightNo2          = sheet.getRange(row, col("Flight No. 2")).getValue();
  const departureDatetime2 = sheet.getRange(row, col("Departure Date/Time 2")).getValue();

  const flightRoute3       = sheet.getRange(row, col("Flight Route 3")).getValue();
  const airline3           = sheet.getRange(row, col("Airline 3")).getValue();
  const flightNo3          = sheet.getRange(row, col("Flight No. 3")).getValue();
  const departureDatetime3 = sheet.getRange(row, col("Departure Date/Time 3")).getValue();

  const tripDescription    = sheet.getRange(row, col("Trip Description")).getValue();
  const tripHighlights     = sheet.getRange(row, col("Trip Highlights")).getValue();

  // 6) format your sent date
  const sentDate           = new Date();
  const sentDateFormatted  = Utilities.formatDate(sentDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // 7) look up package details
  const packageData = packageSheet.getDataRange().getValues();
  let tourDays = '', tourDestinations = '';
  for (let i = 1; i < packageData.length; i++) {
    if (packageData[i][colPackage("Tour Package Name") - 1] === tourPackageName) {
      tourDestinations = packageData[i][colPackage("Destinations") - 1];
      tourDays         = packageData[i][colPackage("Tour Duration") - 1];
      break;
    }
  }

  // 😎 copy & populate the Doc template
  const docTemplateId = "1gH31yywPwUNjtbk8wnPr3ec7cwvUvWtEix0_3EEcRJc";
  const parentFolder  = DriveApp.getFolderById("1VY1dQEsAgIFktMAQK5bcdijxpICACkID");
  function getOrCreateFolder(parent, name) {
    const it = parent.getFoldersByName(name);
    return it.hasNext() ? it.next() : parent.createFolder(name);
  }
  const packageFolder = getOrCreateFolder(parentFolder, tourPackageName);
  const dateFolder    = getOrCreateFolder(packageFolder, sentDateFormatted);
  const templateFile = DriveApp.getFileById(docTemplateId);
  const newDocFile   = safeMakeCopy(
    templateFile,
    ${fullName}_AdventureKit,
    dateFolder
  );
  const doc = DocumentApp.openById(newDocFile.getId());
  const body = doc.getBody();

  // placeholder replacements
  body.replaceText("<<PACKAGE_TOUR_NAME>>", tourPackageName);
  body.replaceText("<<DAYS>>", tourDays);
  body.replaceText("<<DESTINATIONS>>", tourDestinations);
  body.replaceText("<<FULL_NAME>>", fullName);
  body.replaceText("<<BOOKING_REFERENCE>>", bookingRef);
  body.replaceText("<<SENT_DATE>>", sentDateFormatted);
  body.replaceText("<<GENDER>>", gender);
  body.replaceText("<<FLIGHT_ROUTE1>>", flightRoute1);
  body.replaceText("<<AIRLINE1>>", airline1);
  body.replaceText("<<FLIGHT_NO1>>", flightNo1);
  body.replaceText("<<DEPARTURE_DATETIME1>>", departureDatetime1);
  body.replaceText("<<FLIGHT_ROUTE2>>", flightRoute2);
  body.replaceText("<<AIRLINE2>>", airline2);
  body.replaceText("<<FLIGHT_NO2>>", flightNo2);
  body.replaceText("<<DEPARTURE_DATETIME2>>", departureDatetime2);
  body.replaceText("<<FLIGHT_ROUTE3>>", flightRoute3);
  body.replaceText("<<AIRLINE3>>", airline3);
  body.replaceText("<<FLIGHT_NO3>>", flightNo3);
  body.replaceText("<<DEPARTURE_DATETIME3>>", departureDatetime3);
  body.replaceText("<<TRIP_DESCRIPTION>>", tripDescription);
  body.replaceText("<<TRIP_HIGHLIGHTS>>", tripHighlights);
  doc.saveAndClose();

  // 9) convert to PDF
  const pdfBlob = newDocFile.getAs(MimeType.PDF)
    .setName(${fullName}_${sentDateFormatted}_AdventureKit.pdf);

  // 10) build BCC list
  const bccList = bccSheet
    .getRange(2, 1, bccSheet.getLastRow() - 1)
    .getValues()
    .flat()
    .join(",");

  // 11) render your HTML template
  const template = HtmlService.createTemplateFromFile('adventureKitEmail');
  template.fullName          = fullName;
  template.tourPackageName   = tourPackageName;
  template.tourDays          = tourDays;
  template.destination       = tourDestinations;
  template.sentDateFormatted = sentDateFormatted;
  const htmlBody = template.evaluate().getContent();

  // 12) create the Gmail draft
  const subject = ✈️ Your Adventure Kit is Ready – "${tourPackageName}";
  const draft   = GmailApp.createDraft(emailAddress, subject, '', {
    htmlBody:    htmlBody,
    attachments: [pdfBlob],
    bcc:         bccList
  });

  // 13) write the draft link back
  const draftUrl = https://mail.google.com/mail/u/0/#drafts?compose=${draft.getId()};
  updateDraftCell(sheet, row, headers, "Email Draft Link", draftUrl);
}

function sendAdventureKitDraft(sheet, row, headers) {
  function col(name) {
    const i = headers.indexOf(name);
    if (i < 0) throw new Error(Header "${name}" not found.);
    return i + 1;
  }

  const draftLink = sheet.getRange(row, col("Email Draft Link")).getValue();
  const draftId   = draftLink.split("=")[1];
  const drafts    = GmailApp.getDrafts();
  const draft     = drafts.find(d => d.getId() === draftId);

  if (draft) {
    const msg      = draft.send();
    const thread   = msg.getThread();
    const threadUrl= https://mail.google.com/mail/u/0/#inbox/${thread.getId()};

    updateDraftCell(sheet, row, headers, "Sent Email Link", threadUrl);
    updateDraftCell(sheet, row, headers, "Adventure Kit Sent Date", new Date());
  }
}

### reservationEmailTemplate.html:
  <!-- reservationEmailTemplate.html -->
  <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; margin: 0;">
    <div class="email-header" style="width: 100%; margin: 0 auto; margin-bottom: 10px;">
      <img src="https://imheretravels.com/wp-content/uploads/2024/05/siargao-header-1.webp" alt="ImHereTravels Banner" style="width: 100%; max-width: 636px; height: auto; display: block; margin: 0 auto;">
    </div>

    <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 16px; color: #333333;">Hi <strong><?= fullName ?></strong>,</p>


  <!-- Refund Details (for Invalid bookings) -->
  <? if (availablePaymentTerms === "Invalid") { ?>
    
    <!-- Custom Thank You Message for Invalid Booking -->
    <p style="font-size: 16px; color: #333333;">Thank you for choosing ImHereTravels. We truly appreciate your interest in our <strong><?= tourPackage ?></strong>.</p>
    
    <!-- Refund Details Section -->
    <h3 style="color: red;">Refund Details for Your Booking</h3>
    
  <p style="font-size: 16px;">Unfortunately, we’re unable to process your booking because the tour is scheduled to begin within 48 hours. Due to the limited time, we’re not able to complete the necessary arrangements to ensure a smooth and quality travel experience for you.</p>
  <p style="font-size: 16px;">We’d love to help you explore other options. You may rebook a different tour with a later start date by reaching out to us directly, and we’ll be happy to assist.</p>
  <p style="font-size: 16px; color: #333333;">
    Regarding your deposit of <strong style="color: red;">£<?= reservationFee ?></strong>, please let us know your preferred refund method. Kindly send us your bank details so we can process the refund promptly.
  </p>
  </p>
  <p style="font-size: 16px;">Thank you for your understanding, and we hope to assist you on your next adventure.</p>

      <p style="font-size: 16px; color: #333333;">Best regards,</p>
      <p style="font-size: 16px; color: #333333;"><strong>The ImHereTravels Team</strong></p>




      <div style="text-align: left; margin-top: 20px;">
        <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px; height: auto; display: block;">
      </div>


  <? } ?>

  <!-- Payment Terms Rendering -->
  <? if (
    availablePaymentTerms !== "Invalid" &&
    availablePaymentTerms !== "Full payment required within 48hrs" &&
    availablePaymentTerms !== "P1" &&
    availablePaymentTerms !== "P2" &&
    availablePaymentTerms !== "P3" &&
    availablePaymentTerms !== "P4"
  ) { ?>
    <!-- Thank You Message -->
    <p style="font-size: 16px; color: #333333;">
      Thank you for booking with <strong style="color: red;">ImHereTravels!</strong>
    </p>
    <p style="font-size: 16px; color: #333333;">
      Your deposit of <span style="color: red;"><strong>£<?= reservationFee ?></strong></span> has been received, and we’re thrilled to have you join us for an unforgettable adventure!
    </p>
  <? } ?>



  <!-- Final Payment Scenario -->
  <? if (availablePaymentTerms === "Full payment required within 48hrs") { ?>
    <!-- Thank You Message -->
    <p style="font-size: 16px; color: #333333;">Thank you for booking with <strong style="color: red;">ImHereTravels!</strong></p>
    <p style="font-size: 16px; color: #333333;">We’re holding your spot for <strong><?= tourPackage ?></strong>, but your reservation isn’t confirmed yet.</p>

  <!-- Booking Details -->
  <h2 style="color: red; font-size: 24px; margin-top: 0;">Booking Details</h2>
  <table cellpadding="5" style="border-collapse: collapse; width: 100%; max-width: 600px; color: #333333; margin-bottom: 20px;">
    <tr><td><strong>Traveler Name:</strong></td><td><?= fullName ?></td></tr>
    
    <!-- Conditional rendering for Main Booker -->
    <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
      <tr><td><strong>Main Booker:</strong></td><td><?= mainBooker ?></td></tr>
    <? } ?>

    <tr><td><strong>Tour Name:</strong></td><td><?= tourPackage ?></td></tr>
    <tr><td><strong>Tour Date:</strong></td><td><?= tourDate ?></td></tr>
    <tr><td><strong>Tour Duration:</strong></td><td><?= tourDuration ?></td></tr>
    <tr><td><strong>Booking Type:</strong></td><td><?= bookingType ?></td></tr>
    
    <!-- Conditional rendering for Booking ID and Group ID -->
    <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
      <tr><td><strong>Booking ID:</strong></td><td><?= bookingId ?></td></tr>
      <tr><td><strong>Group ID:</strong></td><td><?= groupId ?></td></tr>
    <? } ?>
  </table>


    <p style="font-size: 16px; color: #333333;">
    We’ve received your deposit of <span style="color: red;"><strong>£<?= reservationFee ?></strong></span> — thank you! You're now ready for the next step to finalize your booking.
  </p>
  <h3 style="font-size: 18px; color: red; margin-top: 20px;">
    ⚠️ Final Payment Required Within 48 Hours
  </h3>
  <p style="font-size: 16px; color: #333333;">
    Your tour is less than 30 days away, so monthly payment plans are no longer available. To secure your spot, the remaining balance must be fully paid within 48 hours.
  </p>


    <div style="padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 16px; border-collapse: collapse; table-layout: fixed; border: 1px solid black;">
        <thead>
          <tr>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Payment Terms</th>
            <th align="left" style="padding: 10px; width: 30%; border: 1px solid black;">Amount</th>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Due Date(s)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">Full payment</td>
            <td style="padding: 10px; border: 1px solid black;">£<?= remainingBalance ?></td>
            <td style="padding: 10px; border: 1px solid black;"><?= fullPaymentDueDate ?></td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 14px; font-style: italic; color: #333333;">
    Note: All deposits are non-refundable. Please settle the full balance on or before the due date to avoid cancellations. Don’t forget to send us a proof of payment/screenshot to confirm your booking.
  </p>
    </div>
  <? } ?>




  <!-- P1 Payment Scenario -->
  <? if (availablePaymentTerms === "P1") { ?>

    <!-- Thank You Message for P1 -->
    <p style="font-size: 16px; color: #333333;">Thank you for booking with <strong style="color: red;">ImHereTravels!</strong></p>
    <p style="font-size: 16px; color: #333333;">We’ve received your deposit of <span style="color: red;"><strong>£<?= reservationFee ?></strong></span> — and your spot is nearly secured! We just need the remaining balance to finalize your booking.</p>

    <!-- Booking Details for P1 -->
    <h2 style="color: red; font-size: 24px; margin-top: 0;">Booking Details</h2>
    <table cellpadding="5" style="border-collapse: collapse; width: 100%; max-width: 600px; color: #333333; margin-bottom: 20px;">
      <tr><td><strong>Traveler Name:</strong></td><td><?= fullName ?></td></tr>
      <tr><td><strong>Tour Name:</strong></td><td><?= tourPackage ?></td></tr>
      <tr><td><strong>Tour Date:</strong></td><td><?= tourDate ?></td></tr>        
      <tr><td><strong>Tour Duration:</strong></td><td><?= tourDuration ?></td></tr>
      <tr><td><strong>Booking Type:</strong></td><td><?= bookingType ?></td></tr>
      <tr><td><strong>Booking ID:</strong></td><td><?= bookingId ?></td></tr>
      <!-- Conditional rendering for Group ID -->
      <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
        <tr><td><strong>Group ID:</strong></td><td><?= groupId ?></td></tr>
      <? } ?>
    </table>

    <!-- Payment Terms for P1 -->
    <h3 style="font-size: 20px; color: red;">Final Payment Due Soon</h3>
    <p style="font-size: 16px; color: #333333;">There is only one available payment plan for your tour, so the remaining balance must be paid in full on <strong><?= p1DueDate ?></strong>.</p>

    <!-- Payment Plan Details for P1 -->
    <div style="padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 16px; border-collapse: collapse; table-layout: fixed; border: 1px solid black;">
        <thead>
          <tr>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Payment Terms</th>
            <th align="left" style="padding: 10px; width: 30%; border: 1px solid black;">Amount</th>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Due Date(s)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P1 – Full payment</td>
            <td style="padding: 10px; border: 1px solid black;">£<?= remainingBalance ?></td>
            <td style="padding: 10px; border: 1px solid black;"><?= p1DueDate ?></td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 14px; font-style: italic; color: #333333;">
      Note: All deposits are non-refundable. Please settle the full balance on or before the due date to avoid cancellations. Don’t forget to send us a proof of payment/screenshot to confirm your booking.
      </p>
    </div>

  <? } ?>


  <!-- P2 Payment Scenario -->
  <? if (availablePaymentTerms === "P2") { ?>

    <!-- Thank You Message for P2 -->
    <p style="font-size: 16px; color: #333333;">Thank you for booking with <strong style="color: red;">ImHereTravels!</strong></p>
    <p style="font-size: 16px; color: #333333;">We’ve received your deposit of <span style="color: red;"><strong>£<?= reservationFee ?></strong></span>, and your spot is almost confirmed. You now have the option to pay the balance in full or in two monthly payments.</p>

    <!-- Booking Details for P2 -->
    <h2 style="color: red; font-size: 24px; margin-top: 0;">Booking Details</h2>
    <table cellpadding="5" style="border-collapse: collapse; width: 100%; max-width: 600px; color: #333333; margin-bottom: 20px;">
      <tr><td><strong>Traveler Name:</strong></td><td><?= fullName ?></td></tr>
      <tr><td><strong>Tour Name:</strong></td><td><?= tourPackage ?></td></tr>
      <tr><td><strong>Tour Date:</strong></td><td><?= tourDate ?></td></tr>       
      <tr><td><strong>Tour Duration:</strong></td><td><?= tourDuration ?></td></tr>
      <tr><td><strong>Booking Type:</strong></td><td><?= bookingType ?></td></tr>
      <tr><td><strong>Booking ID:</strong></td><td><?= bookingId ?></td></tr>
      <!-- Conditional rendering for Group ID -->
      <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
        <tr><td><strong>Group ID:</strong></td><td><?= groupId ?></td></tr>
      <? } ?>
    </table>

    <!-- Payment Terms for P2 -->
    <h3 style="font-size: 20px; color: red;">Choose Your Payment Plan</h3>
    <p style="font-size: 16px; color: #333333;">Based on your tour schedule, you have 2 available payment plans. You can choose the payment plan that works best for you.</p>

    <!-- Payment Plan Details for P2 -->
    <div style="padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 16px; border-collapse: collapse; table-layout: fixed; border: 1px solid black;">
        <thead>
          <tr>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Payment Terms</th>
            <th align="left" style="padding: 10px; width: 30%; border: 1px solid black;">Amount</th>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Due Date(s)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P1 – Full payment</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p1Amount ?></td>
            <td style="padding: 10px; border: 1px solid black;"><?= p1DueDate ?></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P2 – Two payments</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p2Amount ?> /month</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p2DueDate ?></td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 14px; font-style: italic; color: #333333;">
      Note: All deposits are non-refundable. Please settle the full balance on or before the due date to avoid cancellations. Don’t forget to send us a proof of payment/screenshot to confirm your booking.
      </p>
    </div>

  <? } ?>


  <!-- P3 Payment Scenario -->
  <? if (availablePaymentTerms === "P3") { ?>

    <!-- Thank You Message for P3 -->
    <p style="font-size: 16px; color: #333333;">Thank you for booking with <strong style="color: red;">ImHereTravels!</strong></p>
    <p style="font-size: 16px; color: #333333;">We’ve received your deposit of <span style="color: red;"><strong>£<?= reservationFee ?></strong></span>, and your spot is almost confirmed. You now have the option to pay the balance in full or in three monthly payments.</p>

    <!-- Booking Details for P3 -->
    <h2 style="color: red; font-size: 24px; margin-top: 0;">Booking Details</h2>
    <table cellpadding="5" style="border-collapse: collapse; width: 100%; max-width: 600px; color: #333333; margin-bottom: 20px;">
      <tr><td><strong>Traveler Name:</strong></td><td><?= fullName ?></td></tr>
      <tr><td><strong>Tour Name:</strong></td><td><?= tourPackage ?></td></tr>
      <tr><td><strong>Tour Date:</strong></td><td><?= tourDate ?></td></tr>       
      <tr><td><strong>Tour Duration:</strong></td><td><?= tourDuration ?></td></tr>
      <tr><td><strong>Booking Type:</strong></td><td><?= bookingType ?></td></tr>
      <tr><td><strong>Booking ID:</strong></td><td><?= bookingId ?></td></tr>
      <!-- Conditional rendering for Group ID -->
      <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
        <tr><td><strong>Group ID:</strong></td><td><?= groupId ?></td></tr>
      <? } ?>
    </table>

    <!-- Payment Terms for P3 -->
    <h3 style="font-size: 20px; color: red;">Choose Your Payment Plan</h3>
    <p style="font-size: 16px; color: #333333;">Based on your tour schedule, you have 3 available payment plans. You can choose the payment plan that works best for you.</p>

    <!-- Payment Plan Details for P3 -->
    <div style="padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 16px; border-collapse: collapse; table-layout: fixed; border: 1px solid black;">
        <thead>
          <tr>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Payment Terms</th>
            <th align="left" style="padding: 10px; width: 30%; border: 1px solid black;">Amount</th>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Due Date(s)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P1 – Full payment</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p1Amount ?></td>
            <td style="padding: 10px; border: 1px solid black;"><?= p1DueDate ?></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P2 – Two payments</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p2Amount ?> /month</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p2DueDate ?></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P3 – Three payments</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p3Amount ?> /month</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p3DueDate ?></td>
          </tr>
        </tbody>
      </table>
    <p style="font-size: 14px; font-style: italic; color: #333333;">
      Note: All deposits are non-refundable. Please settle the full balance on or before the due date to avoid cancellations. Don’t forget to send us a proof of payment/screenshot to confirm your booking.
      </p>
    </div>

  <? } ?>


  <!-- P4 Payment Scenario -->
  <? if (availablePaymentTerms === "P4") { ?>

    <!-- Thank You Message for P4 -->
    <p style="font-size: 16px; color: #333333;">Thank you for booking with <strong style="color: red;">ImHereTravels!</strong></p>
    <p style="font-size: 16px; color: #333333;">We’ve received your deposit of <span style="color: red;"><strong>£<?= reservationFee ?></strong></span>, and your spot is almost confirmed. You now have the option to pay the balance in full or in four monthly payments.</p>

    <!-- Booking Details for P4 -->
    <h2 style="color: red; font-size: 24px; margin-top: 0;">Booking Details</h2>
    <table cellpadding="5" style="border-collapse: collapse; width: 100%; max-width: 600px; color: #333333; margin-bottom: 20px;">
      <tr><td><strong>Traveler Name:</strong></td><td><?= fullName ?></td></tr>
      <tr><td><strong>Tour Name:</strong></td><td><?= tourPackage ?></td></tr>
      <tr><td><strong>Tour Date:</strong></td><td><?= tourDate ?></td></tr>       
      <tr><td><strong>Tour Duration:</strong></td><td><?= tourDuration ?></td></tr>
      <tr><td><strong>Booking Type:</strong></td><td><?= bookingType ?></td></tr>
      <tr><td><strong>Booking ID:</strong></td><td><?= bookingId ?></td></tr>
      <!-- Conditional rendering for Group ID -->
      <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
        <tr><td><strong>Group ID:</strong></td><td><?= groupId ?></td></tr>
      <? } ?>
    </table>

    <!-- Payment Terms for P4 -->
    <h3 style="font-size: 20px; color: red;">Choose Your Payment Plan</h3>
    <p style="font-size: 16px; color: #333333;">Based on your tour schedule, you have 4 available payment plans. You can choose the payment plan that works best for you.</p>

    <!-- Payment Plan Details for P4 -->
    <div style="padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 16px; border-collapse: collapse; table-layout: fixed; border: 1px solid black;">
        <thead>
          <tr>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Payment Terms</th>
            <th align="left" style="padding: 10px; width: 30%; border: 1px solid black;">Amount</th>
            <th align="left" style="padding: 10px; width: 35%; border: 1px solid black;">Due Date(s)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P1 – Full payment</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p1Amount ?></td>
            <td style="padding: 10px; border: 1px solid black;"><?= p1DueDate ?></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P2 – Two payments</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p2Amount ?> /month</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p2DueDate ?></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P3 – Three payments</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p3Amount ?> /month</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p3DueDate ?></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid black;">P4 – Four payments</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p4Amount ?> /month</td>
            <td style="padding: 10px; border: 1px solid black;"><?= p4DueDate ?></td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 14px; font-style: italic; color: #333333;">
      Note: All deposits are non-refundable. Please settle the full balance on or before the due date to avoid cancellations. Don’t forget to send us a proof of payment/screenshot to confirm your booking.
      </p>
    </div>

  <? } ?>





    <? if (availablePaymentTerms !== 'Invalid') { ?>
    <h3 style="font-size: 20px; color: red;">Choose Your Payment Method</h3>
<p style="font-size: 16px; color: #333333; margin-top: 0;">
  You can pay your balance securely using any of the bank options below.
</p>

<table style="width: 100%; font-size: 16px; border-collapse: collapse; table-layout: fixed; border: 1px solid black; margin-bottom: 20px;">
  <thead>
    <tr>
      <th align="left" style="padding: 10px; border: 1px solid black;">Method</th>
      <th align="left" style="padding: 10px; border: 1px solid black;">Details</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 10px; border: 1px solid black;"><strong>PM1 – Revolut Money Transfer</strong></td>
      <td style="padding: 10px; border: 1px solid black;">
        Account Name: Shawn V Keeley<br>
        Account Number: 57555893<br>
        Sort Code: 04-29-09<br>
        IBAN: GB10REVO00997019989462<br>
        BIC: REVOGB21
      </td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid black;"><strong>PM2 – Ulster Bank Transfer</strong></td>
      <td style="padding: 10px; border: 1px solid black;">
        Account Name: Shawn V Keeley<br>
        Account Number: 10561155<br>
        Sort Code: 98-05-83<br>
        IBAN: GB45ULSB98058310561155<br>
        BIC: ULSBGB2B
      </td>
    </tr>
  </tbody>
</table>



    <p style="font-size: 16px; color: #333333;">We can’t wait to welcome you to <?= tourPackage ?> — it’s going to be an unforgettable adventure!</p>
    <p style="font-size: 16px; color: #333333;">Best regards,</p>
      <p style="font-size: 16px; color: #333333;"><strong>The ImHereTravels Team</strong></p>

      <div style="text-align: left; margin-top: 20px;">
        <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px; height: auto; display: block;">
      </div>

  <? } ?>





    



      <p style="font-size: 12px; color: #666666; text-align: center;">You can reply to this email if you have any questions — we’ll get back to you soon.</p>

    <!-- Pre-departure Info Button -->
    <!-- <div style="text-align: center; margin-top: 20px;">
      <a href="https://imheretravels.com/pre-departure-information/"
        style="display: inline-block; background-color: #f13340; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: bold;">
        Check Pre-departure Info
      </a>
    </div> -->

    <!-- Reply to This Email Button -->
    <!-- <div style="text-align: center; margin-top: 20px;">
      <a href="mailto:bella@imhere@gmail.com?subject=Re:%20My%20ImHereTravels%20Booking"
        style="display: inline-block; background-color: #f13340; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 50px; font-size: 16px; font-weight: bold;">
        Reply to This Email
      </a>
    -->









    </div>
  </div>

### cancellationEmailTemplate.html:
<!-- cancellationEmailTemplate.html -->

<p style="font-size: 16px; color: #333333;">Dear <strong><?= fullName ?></strong>,</p>

<p style="font-size: 16px; color: #333333;">
  We’re reaching out with unfortunate news regarding your upcoming <strong><?= tourPackage ?></strong> scheduled for <strong><?= tourDate ?></strong>.
</p>

<p style="font-size: 16px; color: #333333;">
  Due to unforeseen circumstances, we regret to inform you that this tour has been <strong style="color: red;">cancelled</strong>. We understand how disappointing this may be and sincerely apologize for the inconvenience.
</p>

<p style="font-size: 16px; color: #333333;"><strong>You have a couple of options moving forward:</strong></p>

<ul style="font-size: 16px; color: #333333; padding-left: 20px;">
  <li><strong>Reschedule:</strong> We’d be happy to help you rebook the same tour for a future date or explore other travel packages that may suit your schedule.</li>
  <li><strong>Refund:</strong> If you prefer a full refund of <strong style="color: red;"><?= cancelledRefundAmount ?></strong>, please send us your bank details and we’ll process it promptly.</li>
</ul>

<p style="font-size: 16px; color: #333333;">
  Our team is ready to assist you and ensure this experience is handled with care. If you have any questions or need support, don’t hesitate to contact us directly.
</p>

<p style="font-size: 16px; color: #333333;">Thank you for your patience and understanding.</p>
<p style="font-size: 16px; color: #333333;">Warm regards,</p>
<p style="font-size: 16px; color: #333333;"><strong>The ImHereTravels Team</strong></p>

<div style="text-align: left; margin-top: 20px;">
  <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px; height: auto; display: block;">
</div>

### adventureKitEmail.html:
<!-- adventureKitEmail.html -->
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5;">
    <p>Your Adventure Awaits, <?= fullName ?>!</p>

    <p>Here’s everything you need for your "<strong><?= tourPackageName ?></strong>". We’re counting down the days until your island adventure begins!</p>

    <p>Attached is your Adventure Kit – your personalized travel summary containing your internal flights, key travel info, and helpful reminders.</p>

    <p><strong>Quick itinerary preview:</strong></p>
    <ul>
      <li>Tour Name: <?= tourPackageName ?></li>
      <li>Duration: <?= tourDays ?></li>
      <li>Destination: <?= destination ?></li>
      <li>Date Issued: <?= sentDateFormatted ?></li>
    </ul>

    <p>We’re here to support you every step of the way.</p>

    <p>
      Warm regards,<br>
      The ImHereTravels Team<br>
      hello@imheretravels.com | +63 945 000 1234<br>
      <a href="https://www.imheretravels.com">www.imheretravels.com</a> | @imheretravels
    </p>
  </body>
</html>

### sendPaymentReminder.gs:
 function formatGBP(value) {
  return value ? £${Number(value).toFixed(2)} : "";
}

function formatDate(date) {
  if (!date || !(date instanceof Date)) return "";
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}
// Global var
const allTerms = ["P1", "P2", "P3", "P4"];

function createCalendarEventsForRow(row, headers) {
  const calendarId = 'primary';
  const bookingId = row[headers.indexOf("Booking ID")];
  const tourName = row[headers.indexOf("Tour Package Name")];
  const fullName = row[headers.indexOf("Full Name")];
  const guestEmail = row[headers.indexOf("Email Address")];
  const timezone = "Asia/Manila";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main Dashboard");

  const firstName = fullName.split(" ")[0];
  const calendarLinks = {};

  allTerms.forEach(term => {
    const dueDateStr = row[headers.indexOf(${term} Due Date)];
    const calendarEventId = row[headers.indexOf(${term} Calendar Event ID)];

    if (!dueDateStr || calendarEventId) return;

    const dueDate = new Date(dueDateStr);
    const isoDate = Utilities.formatDate(dueDate, timezone, "yyyy-MM-dd");

    const title = Hi ${firstName}, ${term} Payment Due – ${tourName};
    const description = [
      Hi ${fullName},,
      ``,
      This is a reminder for your ${term} payment on ${isoDate} for the tour:,
      ${tourName},
      ``,
      Booking ID: ${bookingId},
      ``,
      You'll receive a popup and email reminder 3 days before the due date.,
      ``,
      Thank you,,
      ImHereTravels
    ].join('\n');

    const event = {
      summary: title,
      description,
      start: { date: isoDate, timeZone: timezone },
      end: { date: isoDate, timeZone: timezone },
      attendees: [{
        email: guestEmail,
        displayName: fullName
      }],
      reminders: {
        useDefault: true,
      },  
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: false,
      colorId: "11" // 🔴 Red
    };

    try {
      const createdEvent = Calendar.Events.insert(event, calendarId, {
        sendUpdates: "all"
      });

      const eventId = createdEvent.id;
      const eventLink = createdEvent.htmlLink;
      calendarLinks[term] = eventLink;

      const sheetRowNumber = sheet.getRange(4, 1, sheet.getLastRow())
        .getValues()
        .findIndex(r => r[headers.indexOf("Booking ID")] === bookingId) + 4;

      if (sheetRowNumber < 4) {
        Logger.log(Booking ID ${bookingId} not found in sheet.);
        return;
      }

      sheet.getRange(sheetRowNumber, headers.indexOf(${term} Calendar Event ID) + 1).setValue(eventId);
      sheet.getRange(sheetRowNumber, headers.indexOf(${term} Calendar Event Link) + 1)
        .setFormula(=HYPERLINK("${eventLink}", "Open Event"));

    } catch (err) {
      Logger.log(Error creating event for ${term}: ${err});
    }
  });

  return calendarLinks;
}

function onEditEnableMonthlyReminder(e) {
  const sheet = e.source.getSheetByName("Main Dashboard");
  const headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0];
  const range = e.range;
  const editedRow = range.getRow();
  const editedCol = range.getColumn();
  const enableReminderCol = headers.indexOf("Enable Payment Reminder") + 1;
  if (editedCol !== enableReminderCol) return;

  const row = sheet.getRange(editedRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const enableReminderValue = row[enableReminderCol - 1];
  if (enableReminderValue !== true) return; // Exit if unchecked

  const email = row[headers.indexOf("Email Address")];
  const fullName = row[headers.indexOf("Full Name")];
  const tourPackage = row[headers.indexOf("Tour Package Name")];
  const plan = row[headers.indexOf("Payment Plan")];

  console.log("Trigger fired for row:", editedRow);
  console.log("Plan:", plan);
  console.log("Email:", email);
  console.log("Due Dates:", row[headers.indexOf("P1 Due Date")], row[headers.indexOf("P2 Due Date")], row[headers.indexOf("P3 Due Date")], row[headers.indexOf("P4 Due Date")]);

  const dueDateCols = {
    P1: headers.indexOf("P1 Due Date"),
    P2: headers.indexOf("P2 Due Date"),
    P3: headers.indexOf("P3 Due Date"),
    P4: headers.indexOf("P4 Due Date"),
  };
  const reminderCols = {
    P1: headers.indexOf("P1 Scheduled Reminder Date"),
    P2: headers.indexOf("P2 Scheduled Reminder Date"),
    P3: headers.indexOf("P3 Scheduled Reminder Date"),
    P4: headers.indexOf("P4 Scheduled Reminder Date"),
  };

  const reminderDaysBefore = 3;

  ["P1", "P2", "P3", "P4"].forEach(term => {
    if (!plan.includes(term)) return;

    const dueDateRaw = row[dueDateCols[term]];
    if (!dueDateRaw || !(dueDateRaw instanceof Date)) return;

    const reminderDate = new Date(dueDateRaw);
    reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);

    sheet.getRange(editedRow, reminderCols[term] + 1).setValue(reminderDate);
  });

  // Create Calendar Events
  const calendarLinks = createCalendarEventsForRow(row, headers, editedRow);

  // Filter based on plan
  const planMatch = plan.match(/P(\d)/);
  const numTerms = planMatch ? parseInt(planMatch[1]) : 0;
  const selectedTerms = allTerms.slice(0, numTerms);

  // Load and populate email template
  const template = HtmlService.createTemplateFromFile("initialPaymentReminder");
  template.fullName = fullName;
  template.tourPackage = tourPackage;
  template.paymentPlan = plan;
  template.paymentMethod = row[headers.indexOf("Payment Method")];

  template.terms = selectedTerms;
  template.amounts = selectedTerms.map(p => formatGBP(row[headers.indexOf(${p} Amount)] || ""));
  template.dueDates = selectedTerms.map(p => {
    const idx = headers.indexOf(${p} Due Date);
    if (idx > -1) {
      const val = row[idx];
      const parsed = new Date(val);
      return !isNaN(parsed.getTime()) ? formatDate(parsed) : "";
    }
    return "";
  });
  template.paidDates = selectedTerms.map(p => formatDate(row[headers.indexOf(${p} Date Paid)] || ""));
  template.calendarLinks = selectedTerms.map(p => calendarLinks?.[p] ?? "");

  console.log("Due Dates for terms:", selectedTerms.map(p => {
    const idx = headers.indexOf(${p} Due Date);
    const val = row[idx];
    return { term: p, idx, raw: val, formatted: formatDate(val) };
  }));

  const htmlBody = template.evaluate().getContent();

  const threads = GmailApp.search(in:sent to:${email} subject:"Monthly Payment Reminder Enabled for ${tourPackage}");
  if (threads.length > 0) {
    SpreadsheetApp.getUi().alert(An email has already been sent to ${email}. Uncheck and retry only if necessary.);
    return;
  }

  GmailApp.sendEmail(email, Monthly Payment Reminder Enabled for ${tourPackage}, "", {
    htmlBody,
    from: "Bella | ImHereTravels <bella@imheretravels.com>"
  });

  const emailLink = https://mail.google.com/mail/u/0/#search/to:${email} subject:Monthly Payment Reminder Enabled for ${tourPackage};
  const sentLinkCol = headers.indexOf("Sent Initial Reminder Link");
  if (sentLinkCol !== -1) {
    const existing = row[sentLinkCol];
    if (existing && existing.toString().trim() !== "") return;
    sheet.getRange(editedRow, sentLinkCol + 1).setFormula(=HYPERLINK("${emailLink}", "View Email"));
  }
}


### initialPaymentReminder.html:
<!-- initialPaymentReminder.html -->
<div style="font-family: Arial, sans-serif; font-size: 14px;">
  <p>Hi <?= fullName ?>,</p>

  <p>
    Thanks for confirming your payment method and plan. Monthly payment reminders have now been scheduled for your tour:
    <strong><?= tourPackage ?></strong>.
  </p>

  <h3 style="color: #d00;">Payment Details</h3>
  <p>
    <strong>Payment Plan:</strong> <?= paymentPlan ?><br>
    <strong>Payment Method:</strong> <?= paymentMethod ?>
  </p>

  <? if (terms.length > 0) { ?>
    <h3 style="color: #d00;">Payment Tracker</h3>
    <table style="border-collapse: collapse; width: 100%;" border="1" cellpadding="6">
      <thead style="background-color: #f2f2f2;">
        <tr>
          <th>Payment Term</th>
          <th>Amount</th>
          <th>Due Date</th>
          <th>Date Paid</th>
          <th>Calendar Invite</th>
        </tr>
      </thead>
      <tbody>
        <? for (let i = 0; i < terms.length; i++) { ?>
          <tr>
            <td><?= terms[i] ?></td>
            <td><?= amounts[i] || "" ?></td>
            <td><?= dueDates[i] || "" ?></td>
            <td><?= paidDates[i] || "" ?></td>
            <td>
              <? if (calendarLinks[i]) { ?>
                <a href="<?= calendarLinks[i] ?>" target="_blank">Open Event</a>
              <? } ?>
            </td>
          </tr>
        <? } ?>
      </tbody>
    </table>
  <? } ?>

  <p>Your due dates have been added to your payment plan. You’ll receive reminders 3 days before each deadline.</p>

  <p>Warm regards,<br><strong>The ImHereTravels Team</strong></p>

  <div style="margin-top: 20px;"> 
    <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px;">
  </div>
</div>


### paymentReminderTemplate.html:
<!-- paymentReminderTemplate.html -->
<div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
    <p style="font-size: 16px; color: #333;">Hi <strong><?= fullName ?></strong>,</p>


    <p style="font-size: 16px; color: #333;">
      This is a friendly reminder that your <strong><?= paymentLabel ?></strong> payment of <strong style="color: red;"><?= amount ?></strong> for your upcoming <strong><?= tourPackage ?></strong> is due on <strong><?= dueDate ?></strong>.
    </p>
  

    <p style="font-size: 16px; color: #333;">
      Please ensure this payment is completed on or before the due date to keep your booking active. Don’t forget to send us your proof of payment!
    </p>


    <p style="font-size: 16px; color: #333;">Booking ID: <strong><?= bookingId ?></strong></p>


    <h3 style="color: red;">Payment Methods</h3>
    <p style="font-size: 16px; color: #333;">You can use any of the secure options below:</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 16px; border: 1px solid #ccc;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ccc;"><strong>PM1 – Revolut</strong></td>
        <td style="padding: 10px; border: 1px solid #ccc;">
          Account: Shawn V Keeley<br>
          Account Number: 57555893<br>
          Sort Code: 04-29-09<br>
          IBAN: GB10REVO00997019989462<br>
          BIC: REVOGB21
        </td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ccc;"><strong>PM2 – Ulster Bank</strong></td>
        <td style="padding: 10px; border: 1px solid #ccc;">
          Account: Shawn V Keeley<br>
          Account Number: 10561155<br>
          Sort Code: 98-05-83<br>
          IBAN: GB45ULSB98058310561155<br>
          BIC: ULSBGB2B
        </td>
      </tr>
    </table>


    <p style="font-size: 16px; color: #333;">If you have any questions, just reply to this email — we're here to help!</p>


    <p style="font-size: 16px; color: #333;">Best regards,<br><strong>The ImHereTravels Team</strong></p>
    <div style="margin-top: 20px;">
      <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px;">
    </div>
  </div>
</div>






### clearCheckedRowsWithPrompt.gs:
function clearCheckedRowsWithPrompt() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Main Dashboard');
  const headers = sheet.getRange(3, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
  const startRow = 4; // Your data actually starts on row 4, below header
  const lastRow = sheet.getLastRow();

  const getColIndex = (headerName) => {
    const index = headers.indexOf(headerName.trim());
    if (index === -1) throw new Error(Header not found: "${headerName}");
    return index + 1;
  };

  const checkBoxCol = getColIndex("Select Row/s");

  const colsToClear = [
    { start: getColIndex("Email Address"), end: getColIndex("Last Name") },
    { start: getColIndex("Reservation Date"), end: getColIndex("Tour Date") },
    { start: getColIndex("Group ID"), end: getColIndex("Group ID") },
    { start: getColIndex("Email Draft Link"), end: getColIndex("Subject Line (Reservation)") },
    { start: getColIndex("Sent Email Link"), end: getColIndex("Reservation Email Sent Date") },
    { start: getColIndex("Payment Plan"), end: getColIndex("Payment Method") },      
    { start: getColIndex("Full Payment Date Paid"), end: getColIndex("Full Payment Date Paid") },
    { start: getColIndex("P1 Date Paid"), end: getColIndex("P1 Date Paid") },
    { start: getColIndex("P2 Date Paid"), end: getColIndex("P2 Date Paid") },
    { start: getColIndex("P3 Date Paid"), end: getColIndex("P3 Date Paid") },
    { start: getColIndex("P4 Date Paid"), end: getColIndex("P4 Date Paid") },    
    { start: getColIndex("Reason for Cancellation"), end: getColIndex("Reason for Cancellation") },
    { start: getColIndex("Cancellation Email Draft Link"), end: getColIndex("Subject Line (Cancellation)") },
    { start: getColIndex("Sent Cancellation Email Link"), end: getColIndex("Cancellation Email Sent Date") },
  ];

  // ✅ Find all checkbox columns by scanning row 4's validations
  const allCheckboxCols = [];
  headers.forEach((header, idx) => {
    const col = idx + 1;
    const rule = sheet.getRange(startRow, col).getDataValidation();
    if (rule && rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.CHECKBOX) {
      allCheckboxCols.push(col);
    }
  });

  if (!allCheckboxCols.includes(checkBoxCol)) {
    allCheckboxCols.push(checkBoxCol);
  }

  const rowsToClear = [];

  const checkboxValues = sheet.getRange(startRow, checkBoxCol, lastRow - startRow + 1).getValues();

  checkboxValues.forEach((val, i) => {
    if (val[0] === true) {
      rowsToClear.push(startRow + i);
    }
  });

  if (rowsToClear.length === 0) {
    ui.alert('No rows are selected.');
    return;
  }

  const response = ui.alert(
    'Are you sure?',
    'This will clear data and uncheck ALL checkboxes for each selected row. Proceed?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    rowsToClear.forEach(row => {
      colsToClear.forEach(({ start, end }) => {
        sheet.getRange(row, start, 1, end - start + 1).clearContent();
      });
      // ✅ Uncheck ALL checkboxes in this row
      allCheckboxCols.forEach(col => {
        sheet.getRange(row, col).setValue(false);
      });
    });
    ui.alert(✅ Cleared data and unchecked ALL checkboxes for ${rowsToClear.length} row(s).);
  } else {
    ui.alert('Canceled. No data was changed.');
  }
}
 
