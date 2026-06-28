# Spider Smart Solution — Inventory Management System (IMS)

## What is this Document?
This guide explains two powerful features of our Inventory Management System in simple, plain language:
1. **The e-Discovery Section** (how we lock and download files for legal reasons).
2. **The Warehouse Section** (how we organize physical storage boxes and find the best spot for them).

---

## 1. e-Discovery: The Legal Lockbox

### What is it and why do we need it?
Imagine your company gets involved in a legal dispute or a tax audit. The lawyers say, "Do not touch, modify, or delete any invoices or financial reports from Q3 2023!" 

In the physical world, you would go to the archives room, pull out those boxes, put them in a secure room, and put a big padlock on the door. This is called a **"Legal Hold."**

The **e-Discovery** section does exactly this digitally. It lets you search for specific keywords, lock those files so nobody can delete or change them (not even administrators), and pack them into a secure file to send to lawyers or investigators.

### Real-World Example & Workflow
Let's say the company is being audited for its **Q3 2023 Finance records** because of a dispute about an **invoice**.

Here is how a compliance officer uses this tool step-by-step:
1. **Create the Case:** The officer logs in, goes to the **e-Discovery** page, clicks **"New Case"**, and names it *"Q3 2023 Invoice Dispute Audit"*. They enter the search keywords: `invoice, Q3 2023, finance`.
2. **Search and Lock (Scan & Apply Hold):** They click **"Scan & Apply Legal Hold"**. The system instantly searches through the database. 
   - Any file with these keywords in its description, department, or company name is found.
   - The system automatically marks these files as **"On Legal Hold."** 
   - **Crucial Rule:** Once locked, these files cannot be deleted or edited. This prevents accidental loss or intentional tampering with evidence.
3. **Exporting the Evidence (Forensic ZIP):** The officer clicks **"Export Forensic ZIP"**. The system packages everything into a secure `.zip` archive. 

### What is inside the downloaded Forensic ZIP?
To make sure the court of law accepts the files, the ZIP file contains four items:
* **`inventory_metadata.csv` (The Master List):** An Excel-like spreadsheet listing all the locked records.
* **`individual_records/` (Detailed File Folders):** Individual files containing the complete details of each record, including tags and custom fields.
* **`audit_chain.csv` (The History Log):** A chronological history of every action taken on these records (who created them, who edited them, when, and from what computer). This history is linked together mathematically (using cryptography) so if anyone tries to rewrite history, the system immediately catches it.
* **`manifest.json` (The Digital Seal):** A receipt containing a unique "digital fingerprint" (called a SHA-256 hash) for every single file. If a lawyer or investigator modifies even one letter in any of the files, the fingerprint changes, proving the evidence was tampered with.

### How the Screen Looks (User Interface)
* **The New Case Form:** A simple popup window where you type in the Case Name, Description, and Keywords (separated by commas).
* **The Cases Sidebar:** A clean list on the left side of the screen showing all your legal cases, a color badge showing if it is `Open` or if the `Hold is Applied`, and how many records are locked.
* **The Details Panel:** The main area in the center. It shows the details of the active case, three large count cards (Total Keywords, Total Locked Files, Hold Status), and two big action buttons:
  - **Scan & Apply Legal Hold** (Locks the files).
  - **Export Forensic ZIP** (Downloads the secure legal package).

---

## 2. Warehouse Layout: The Intelligent Organizer

### What is it and why do we need it?
Archival warehouses are huge. They have hundreds of rows, shelves, and bins. If you store boxes randomly:
* It takes forever to find them when you need them.
* Workers spend hours walking back and forth.
* Files from the same department (like HR or Legal) get scattered everywhere.

The **Warehouse Layout** section is a digital blueprint of your physical warehouse. It groups the storage layout into five levels:
$$\text{Warehouse (Building)} \rightarrow \text{Zone (Area)} \rightarrow \text{Aisle (Row)} \rightarrow \text{Shelf (Level)} \rightarrow \text{Bin (The exact spot)}$$

More importantly, it includes an **intelligent recommendation engine** that tells you exactly where to put a new box based on two smart rules:
1. **Department Clustering (Keep Friends Together):** It tries to put files from the same department next to each other.
2. **Proximity Routing (Save Travel Time):** It recommends spots closest to the main warehouse entrance/loading dock so the worker doesn't have to walk to the far back of the building.

### Real-World Example & Workflow
Let's say a worker has a brand new box of paper documents from the **"Legal"** department to store.
1. **Request a Spot:** The worker opens the **Warehouse** screen and selects the building they are in (e.g., *"Main Storage Vault"*).
2. **Enter Department:** In the search bar under **"Layout Optimization"**, they type `"Legal"` and click **"Recommend"**.
3. **Smart Suggestion:** The system calculates:
   - Which bins are empty.
   - Where the other `"Legal"` boxes are already stored.
   - Which of those spots is closest to the front door.
   *It shows: "We recommend Bin LGL-104 (Zone B > Aisle 2 > Shelf Level 1). Why? Because it keeps Legal files clustered together and minimizes walking distance."*
4. **Put Away:** The worker walks to Aisle 2, puts the box in Bin `LGL-104`, and updates the system. The bin changes from "Available" to "Occupied".

### How the Screen Looks (User Interface)
* **Warehouse List (Left Sidebar):** A list of all your storage buildings. It shows the name, address, number of zones, and total capacity (e.g., 5 zones, 500 bins).
* **Metrics Cards (Top Center):** Four quick summary cards showing:
  - **Total Bins:** Total capacity.
  - **Occupied:** Number of spots currently full.
  - **Available:** Empty spots ready for new boxes.
  - **Occupancy:** A percentage gauge showing how full the warehouse is (e.g., 65% full).
* **Recommend Bin Box (Center):** A simple search bar where you type a department name and click a button to get the best storage recommendation.
* **Interactive Layout Tree (Bottom Center):** A visual breakdown that expands like folder trees on a computer:
  - Click on a **Zone** (e.g., Zone A) to see rows of **Aisles** (Aisle 1, Aisle 2).
  - Click on an **Aisle** to see the **Shelves** (Level 1, Level 2).
  - Each shelf shows a grid of little boxes (Bins). **Gray** bins are empty and available. **Purple** bins are occupied. Hovering over a purple bin shows the barcode of the box inside.
