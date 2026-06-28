import { create } from 'zustand'

export type Language = 'en' | 'ar'

type TranslationKeys = 
  // Sidebar & Navigation
  | 'dashboard'
  | 'records'
  | 'reports'
  | 'import'
  | 'auditLog'
  | 'eDiscovery'
  | 'warehouse'
  | 'users'
  | 'masterData'
  | 'classification'
  | 'mainNavigation'
  | 'administration'
  | 'logoTitle'
  | 'copyright'
  
  // Navbar
  | 'globalSearchPlaceholder'
  | 'profileSettings'
  | 'preferences'
  | 'theme'
  | 'light'
  | 'dark'
  | 'system'
  | 'logout'
  | 'guest'
  | 'externalGuest'

  // Common UI / Buttons
  | 'addRecord'
  | 'edit'
  | 'delete'
  | 'save'
  | 'cancel'
  | 'actions'
  | 'status'
  | 'searchPlaceholder'
  | 'loading'

  // Record details / Fields
  | 'boxBarcode'
  | 'fileBarcode'
  | 'description'
  | 'entity'
  | 'department'
  | 'location'
  | 'category'
  | 'tags'
  | 'recordDate'
  | 'legalHold'
  | 'active'
  | 'inactive'

  // Dashboard specifics
  | 'welcomeBack'
  | 'totalRecords'
  | 'activeHolds'
  | 'totalCategories'
  | 'auditIntegrity'
  | 'recentActivity'
  | 'recordsByCategory'
  | 'exportReport'
  | 'viewDetails'

const translations: Record<Language, Record<TranslationKeys, string>> = {
  en: {
    dashboard: 'Dashboard',
    records: 'Records',
    reports: 'Reports',
    import: 'Import',
    auditLog: 'Audit Log',
    eDiscovery: 'e-Discovery',
    warehouse: 'Warehouse',
    users: 'Users',
    masterData: 'Master Data',
    classification: 'Classification',
    mainNavigation: 'Main Navigation',
    administration: 'Administration',
    logoTitle: 'SpiderSmart IMS',
    copyright: 'Spider Smart Solution © 2026',

    globalSearchPlaceholder: 'Global Search (Entity, Barcode, etc.)',
    profileSettings: 'Profile Settings',
    preferences: 'Preferences',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    logout: 'Log out',
    guest: 'Guest',
    externalGuest: 'External Guest',

    addRecord: 'Add Record',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    actions: 'Actions',
    status: 'Status',
    searchPlaceholder: 'Search records...',
    loading: 'Loading...',

    boxBarcode: 'Box Barcode',
    fileBarcode: 'File Barcode',
    description: 'Description',
    entity: 'Entity',
    department: 'Department',
    location: 'Location',
    category: 'Category',
    tags: 'Tags',
    recordDate: 'Record Date',
    legalHold: 'Legal Hold',
    active: 'Active',
    inactive: 'Inactive',

    welcomeBack: 'Welcome back',
    totalRecords: 'Total Records',
    activeHolds: 'Active Holds',
    totalCategories: 'Total Categories',
    auditIntegrity: 'Audit Integrity',
    recentActivity: 'Recent Activity',
    recordsByCategory: 'Records by Category',
    exportReport: 'Export Report',
    viewDetails: 'View Details',
  },
  ar: {
    dashboard: 'لوحة القيادة',
    records: 'السجلات',
    reports: 'التقارير',
    import: 'استيراد',
    auditLog: 'سجل التدقيق',
    eDiscovery: 'الكشف الإلكتروني',
    warehouse: 'المستودع',
    users: 'المستخدمين',
    masterData: 'البيانات الأساسية',
    classification: 'التصنيف',
    mainNavigation: 'التنقل الرئيسي',
    administration: 'الإدارة',
    logoTitle: 'سبايدر سمارت IMS',
    copyright: 'سبايدر سمارت سولوشنز © ٢٠٢٦',

    globalSearchPlaceholder: 'البحث العام (الكيان، الرمز الشريطي، إلخ)',
    profileSettings: 'إعدادات الملف الشخصي',
    preferences: 'التفضيلات',
    theme: 'المظهر',
    light: 'مضيء',
    dark: 'داكن',
    system: 'نظام التشغيل',
    logout: 'تسجيل الخروج',
    guest: 'ضيف',
    externalGuest: 'ضيف خارجي',

    addRecord: 'إضافة سجل',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    actions: 'الإجراءات',
    status: 'الحالة',
    searchPlaceholder: 'البحث في السجلات...',
    loading: 'جاري التحميل...',

    boxBarcode: 'باركود الصندوق',
    fileBarcode: 'باركود الملف',
    description: 'الوصف',
    entity: 'الكيان',
    department: 'القسم',
    location: 'الموقع',
    category: 'الفئة',
    tags: 'الوسوم',
    recordDate: 'تاريخ السجل',
    legalHold: 'تحفظ قانوني',
    active: 'نشط',
    inactive: 'غير نشط',

    welcomeBack: 'مرحباً بك مجدداً',
    totalRecords: 'إجمالي السجلات',
    activeHolds: 'التحفظات النشطة',
    totalCategories: 'إجمالي الفئات',
    auditIntegrity: 'سلامة التدقيق',
    recentActivity: 'النشاط الأخير',
    recordsByCategory: 'السجلات حسب الفئة',
    exportReport: 'تصدير التقرير',
    viewDetails: 'عرض التفاصيل',
  }
}

const recordTextTranslations: Record<Language, Record<string, string>> = {
  en: {},
  ar: {
    // ─── Common words used via translate() in AdminMaster ───
    'Add': 'إضافة',
    'Add New': 'إضافة جديد',
    'Edit': 'تعديل',
    'Rule': 'قاعدة',
    'Entity': 'الكيان',
    'Schema': 'المخطط',
    'Item': 'عنصر',
    'Record Types & Schemas': 'أنواع السجلات والمخططات',
    // ─── Entities & Departments & Categories ───
    'Spider Smart': 'سبايدر سمارت',
    'Exprivia.IT': 'إكسبريفيا آي تي',
    'Google': 'جوجل',
    'Headquarters': 'المقر الرئيسي',
    'Finance': 'المالية',
    'R&D': 'الأبحاث والتطوير',
    'IT Support': 'الدعم الفني',
    'Legal': 'الشؤون القانونية',
    'HR': 'الموارد البشرية',
    'Operations': 'العمليات',
    'Marketing': 'التسويق',
    'Sales': 'المبيعات',
    'Procurement': 'المشتريات',
    'Compliance': 'الامتثال',
    'Management': 'الإدارة',
    'Accounting': 'المحاسبة',
    'Administration': 'الإدارة العامة',

    // ─── Locations & Racks ───
    'Rack A1': 'رف أ١',
    'SHELF-A1': 'رف أ١',
    'SECURE-B2': 'خزنة ب٢',
    'Main Storage': 'التخزين الرئيسي',
    'Archive Room': 'غرفة الأرشيف',
    'Vault': 'الخزنة الآمنة',

    // ─── Record Types / Categories ───
    'Physical Box': 'صندوق فيزيائي',
    'Individual File': 'ملف فردي',
    'Digital Media': 'وسائط رقمية',
    'Financial Records': 'سجلات مالية',
    'HR Personnel Files': 'ملفات شؤون الموظفين',
    'Corporate': 'المؤسسة',
    'Branch': 'الفرع',
    'Client': 'العميل',
    'Partner': 'الشريك',
    'Standard': 'قياسي',
    'Confidential': 'سري',
    'Classified': 'مصنّف',

    // ─── Statuses ───
    'ACTIVE': 'نشط',
    'DUE': 'مستحق',
    'DISPOSED': 'متخلص منه',
    'LEGAL_HOLD': 'تحفظ قانوني',
    'HOLD_APPLIED': 'تم تطبيق التحفظ',
    'OPEN': 'مفتوح',
    'CLOSED': 'مغلق',
    'Active': 'نشط',
    'Disabled': 'معطّل',

    // ─── User Roles ───
    'SYSTEM_ADMIN': 'مدير النظام',
    'RECORDS_MANAGER': 'مدير السجلات',
    'KNOWLEDGE_WORKER': 'موظف المعرفة',
    'AUDITOR': 'مدقق الحسابات',
    'EXTERNAL_GUEST': 'ضيف خارجي',
    'Administrator': 'مدير النظام',
    'Records Manager': 'مدير السجلات',
    'Knowledge Worker': 'موظف المعرفة',
    'External Guest': 'ضيف خارجي',
    'Auditor': 'مدقق',

    // ─── Audit Actions ───
    'CREATE': 'إنشاء',
    'UPDATE': 'تعديل',
    'DELETE': 'حذف',
    'LOGIN': 'تسجيل الدخول',
    'LOGOUT': 'تسجيل الخروج',
    'LEGAL_HOLD_APPLIED': 'تم تطبيق التحفظ القانوني',
    'LEGAL_HOLD_REMOVED': 'تم رفع التحفظ القانوني',
    'DISPOSE': 'إتلاف',
    'RESTORE': 'استعادة',
    'EDISCOVERY_BULK_HOLD': 'تحفظ جماعي إلكتروني',
    'IMPORT': 'استيراد',
    'EXPORT': 'تصدير',

    // ─── Table Headers ───
    'Barcodes': 'أكواد الباركود',
    'Origin': 'المصدر',
    'Taxonomy': 'التصنيف',
    'Details': 'التفاصيل',
    'Actions': 'الإجراءات',
    'Status': 'الحالة',
    'Timestamp': 'الطابع الزمني',
    'Action': 'الإجراء',
    'User': 'المستخدم',
    'Resource ID': 'معرّف المورد',
    'Name': 'الاسم',
    'Email': 'البريد الإلكتروني',
    'Role': 'الدور',
    'Entity Type': 'نوع الكيان',
    'Created': 'تاريخ الإنشاء',
    'Type': 'النوع',
    'Level': 'المستوى',
    'Parent': 'الأصل',
    'Records Count': 'عدد السجلات',

    // ─── Status & Fallbacks ───
    'Uncategorized': 'غير مصنف',
    'no tags': 'لا توجد وسوم',
    'No tags': 'لا توجد وسوم',
    'No records found': 'لم يتم العثور على سجلات',
    'Try adjusting your search terms or filters.': 'حاول تعديل كلمات البحث أو الفلاتر.',
    'Search records...': 'البحث في السجلات...',
    'N/A': 'غير متاح',
    'System': 'النظام',
    'Not Set': 'غير محدد',
    'None': 'لا شيء',
    'Root': 'الجذر',

    // ─── Dashboard ───
    'Dashboard Overview': 'نظرة عامة على لوحة القيادة',
    "Welcome back. Here is what's happening across your inventory today.": "مرحباً بك مجدداً. إليك ما يحدث في المخزون اليوم.",
    'Due for Disposition': 'مستحق للتخلص منه',
    'Recent Activity (7d)': 'النشاط الأخير (٧ أيام)',
    'Recent Activity': 'النشاط الأخير',
    'View All': 'عرض الكل',
    'Quick Actions': 'الإجراءات السريعة',
    'Inventory': 'المخزون',
    'Bulk Import': 'استيراد جماعي',
    'No recent activity found.': 'لم يتم العثور على نشاط حديث.',
    'Action on': 'إجراء على',
    'Record': 'سجل',
    'Performed by': 'تم بواسطة',
    'Total Records': 'إجمالي السجلات',
    'Active Holds': 'التحفظات النشطة',
    'Reports': 'التقارير',
    'Audit Log': 'سجل التدقيق',

    // ─── Records Page ───
    'Records': 'السجلات',
    'Found': 'تم العثور على',
    'records matching criteria.': 'سجلات مطابقة للمعايير.',
    'Export': 'تصدير',
    'Create Record': 'إنشاء سجل',
    'Search everything: barcodes, description, entity, department...': 'البحث في كل شيء: الباركود، الوصف، الكيان، القسم...',
    'Enable AI Semantic Search (Fuzzy & Contextual Matching)': 'تفعيل البحث الدلالي بالذكاء الاصطناعي (مطابقة سياقية)',
    'Searches meaning and concepts instead of literal keyword matches.': 'يبحث في المعاني والمفاهيم بدلاً من المطابقة الحرفية.',
    'Barcode Lookup': 'البحث بالباركود',
    'Type barcode...': 'اكتب الباركود...',
    'Browse Taxonomy': 'تصفح التصنيف',
    'Faceted Filters': 'الفلاتر المتعددة',
    'Showing': 'عرض',
    'to': 'إلى',
    'of': 'من',
    'Page': 'صفحة',
    'Records Selected': 'سجلات محددة',
    'eDiscovery ZIP': 'أرشيف الكشف الإلكتروني',
    'CSV Spreadsheet': 'جدول CSV',
    'Excel (XLSX)': 'إكسل (XLSX)',
    'PDF Report': 'تقرير PDF',
    'Clear All Filters': 'مسح جميع الفلاتر',
    'All Types': 'جميع الأنواع',
    'All Entities': 'جميع الكيانات',
    'All Departments': 'جميع الأقسام',
    'All Statuses': 'جميع الحالات',
    'Keyword Search': 'البحث بالكلمات',
    'Search descriptions, tags...': 'البحث في الأوصاف والوسوم...',
    'Filter by location...': 'تصفية حسب الموقع...',
    'Filter by User ID...': 'تصفية حسب معرف المستخدم...',
    'Record Date': 'تاريخ السجل',
    'e.g. Finance, Vital...': 'مثال: المالية، حيوي...',
    'All Locations': 'جميع المواقع',
    'Disposed': 'متخلص منه',
    'Legal Hold': 'تحفظ قانوني',
    // 'Due for Disposition': 'مستحق للتخلص',

    // ─── Record Detail Page ───
    'Back to Inventory': 'العودة إلى المخزون',
    'Active Legal Hold': 'تحفظ قانوني نشط',
    'This record is legally protected. Retention disposition and modification are suspended.': 'هذا السجل محمي قانونياً. تم تعليق التخلص منه وتعديله.',
    'Retention Expired': 'انتهت مدة الاحتفاظ',
    'This record has reached its mandatory retention limit and is eligible for final disposition.': 'وصل هذا السجل إلى حد الاحتفاظ الإلزامي وهو مؤهل للتخلص منه نهائياً.',
    'Release Hold': 'رفع التحفظ',
    'Apply Legal Hold': 'تطبيق التحفظ القانوني',
    'Edit Record': 'تعديل السجل',
    'General Information': 'معلومات عامة',
    'Version History': 'تاريخ الإصدارات',
    'Compliance Status': 'حالة الامتثال',
    'Lifecycle State': 'حالة دورة الحياة',
    'Record Age': 'عمر السجل',
    'Retention Due': 'تاريخ استحقاق الاحتفاظ',
    'Final Disposition': 'التخلص النهائي',
    'Disposal blocked by Legal Hold': 'الإتلاف محظور بسبب التحفظ القانوني',
    'Eligible for disposal on': 'مؤهل للتخلص منه بتاريخ',
    'Metadata': 'البيانات الوصفية',
    'Classification Tags': 'وسوم التصنيف',
    'No tags applied': 'لا توجد وسوم مطبقة',
    'File:': 'ملف:',
    'Version': 'الإصدار',
    'Record not found': 'السجل غير موجود',
    'Back to Records': 'العودة إلى السجلات',
    'years': 'سنوات',
    'ID:': 'المعرف:',
    'Created:': 'تاريخ الإنشاء:',
    'Updated:': 'تاريخ التعديل:',

    // ─── Reports Page ───
    'Analytics & Reports': 'التحليلات والتقارير',
    'Generate insights and export data from your inventory system.': 'استخرج رؤى وصدّر البيانات من نظام المخزون.',
    'Records by Entity': 'السجلات حسب الكيان',
    'Records by Department': 'السجلات حسب القسم',
    'Records by Year': 'السجلات حسب السنة',
    'Records by Location': 'السجلات حسب الموقع',
    'Retention Compliance': 'امتثال الاحتفاظ',
    'Upcoming Dispositions': 'التخلصات القادمة',
    'Activity by User': 'النشاط حسب المستخدم',
    'Legal Holds Active': 'التحفظات القانونية النشطة',
    'Custom Report Builder': 'منشئ التقارير المخصصة',
    'Export Schedules': 'جدولة التصدير',
    'Export CSV': 'تصدير CSV',
    'Export PDF': 'تصدير PDF',
    'Refresh': 'تحديث',
    'No data available for this report.': 'لا توجد بيانات لهذا التقرير.',
    'Count': 'العدد',
    'Box Barcode': 'باركود الصندوق',
    'File Barcode': 'باركود الملف',
    'Due Date': 'تاريخ الاستحقاق',
    'No upcoming dispositions in the next': 'لا توجد تخلصات قادمة في الـ',
    'days.': 'يوماً.',
    'No active legal holds.': 'لا توجد تحفظات قانونية نشطة.',
    'Select Columns': 'اختر الأعمدة',
    'Generate Report': 'إنشاء التقرير',
    'Generating...': 'جاري الإنشاء...',
    'No columns selected.': 'لم يتم اختيار أعمدة.',
    'Run query first to see results.': 'قم بتشغيل الاستعلام أولاً لرؤية النتائج.',
    'No recurring exports scheduled yet.': 'لم يتم جدولة أي تصدير متكرر بعد.',
    'Create New Schedule': 'إنشاء جدولة جديدة',
    'Report Type': 'نوع التقرير',
    'Format': 'الصيغة',
    'Cron Expression': 'تعبير Cron',
    'Email Recipients': 'المستلمون بالبريد الإلكتروني',
    'email1@example.com, email2@example.com': 'بريد1@مثال.com، بريد2@مثال.com',
    'New Export Schedule': 'جدولة تصدير جديدة',
    'Create Schedule': 'إنشاء الجدولة',
    'Year': 'السنة',
    'Report': 'تقرير',
    'Schedule Recurring Export': 'جدولة التصدير المتكرر',
    'Box Barcode (column)': 'باركود الصندوق',
    'File Barcode (column)': 'باركود الملف',
    'Entity (column)': 'الكيان',
    'Department (column)': 'القسم',
    'Location (column)': 'الموقع',
    'Status (column)': 'الحالة',
    'Created At': 'تاريخ الإنشاء',
    'Created At (column)': 'تاريخ الإنشاء',

    // ─── Audit Page ───
    'Compliance Audit Trail': 'مسار تدقيق الامتثال',
    'Immutable log of all system actions with cryptographic tamper-evidence.': 'سجل غير قابل للتغيير لجميع إجراءات النظام مع أدلة تشفيرية على التلاعب.',
    'Verify Log Integrity': 'التحقق من سلامة السجل',
    'All Actions': 'جميع الإجراءات',
    'Integrity Verified': 'تم التحقق من السلامة',
    'TAMPERING DETECTED': 'تم اكتشاف تلاعب',
    'Inspect': 'فحص',
    'Payload Inspection': 'فحص البيانات',
    'Log ID': 'معرّف السجل',
    'Tamper Hash': 'تجزئة مقاومة التلاعب',
    'Data Changes (JSON)': 'تغييرات البيانات (JSON)',
    'logs have been mathematically verified against their cryptographic hashes.': 'تم التحقق رياضياً منها مقابل تجزئاتها التشفيرية.',
    'invalid entries out of': 'إدخالات غير صالحة من أصل',
    'logs checked. Immediate investigation required.': 'سجل تم فحصه. مطلوب تحقيق فوري.',
    'Total Logs:': 'إجمالي السجلات:',
    'Close': 'إغلاق',
    'All': 'الكل',

    // ─── e-Discovery Page ───
    'e-Discovery Case Manager': 'مدير قضايا الكشف الإلكتروني',
    'Initiate legal holds, scan for matching records, and generate forensic archives.': 'ابدأ تحفظات قانونية، وابحث عن السجلات المطابقة، وأنشئ أرشيفات جنائية.',
    'New Case': 'قضية جديدة',
    'Cases': 'القضايا',
    'New e-Discovery Case': 'قضية كشف إلكتروني جديدة',
    'Case Title *': 'عنوان القضية *',
    'e.g. Q3 Finance Litigation Hold': 'مثال: تحفظ تقاضي المالية للربع الثالث',
    'Case Description': 'وصف القضية',
    'Brief case description...': 'وصف مختصر للقضية...',
    'Search Keywords *': 'كلمات البحث *',
    '(comma-separated)': '(مفصولة بفاصلة)',
    'e.g. invoice, tax filing, financial report, Q3 2023': 'مثال: فاتورة، إقرار ضريبي، تقرير مالي',
    'Records matching any of these keywords in description, entity, or department will be flagged.': 'سيتم تحديد السجلات التي تطابق أي من هذه الكلمات في الوصف أو الكيان أو القسم.',
    'Create Case': 'إنشاء القضية',
    'Select a case to view details': 'حدد قضية لعرض التفاصيل',
    'No cases yet.': 'لا توجد قضايا بعد.',
    'records matched': 'سجلات متطابقة',
    'Case ID:': 'معرف القضية:',
    'Search Keywords': 'كلمات البحث',
    'Keywords': 'الكلمات المفتاحية',
    'Records Held': 'السجلات المحتجزة',
    'Hold Active': 'التحفظ نشط',
    'No Hold': 'لا يوجد تحفظ',
    'Scan & Apply Legal Hold': 'فحص وتطبيق التحفظ القانوني',
    'Hold Already Applied': 'تم تطبيق التحفظ مسبقاً',
    'Export Forensic ZIP': 'تصدير الأرشيف الجنائي',
    'Run "Scan & Apply Legal Hold" first to lock matching records, then export the forensic archive.': 'قم بتشغيل "فحص وتطبيق التحفظ" أولاً لقفل السجلات المطابقة، ثم صدّر الأرشيف الجنائي.',
    'Legal hold applied to': 'تم تطبيق التحفظ القانوني على',
    'HOLD APPLIED': 'تم التحفظ',

    // ─── Warehouse Page ───
    'Warehouse Layout': 'تخطيط المستودع',
    'Manage spatial storage layouts and get optimized bin recommendations.': 'إدارة تخطيطات التخزين المكانية والحصول على توصيات مُحسّنة للحاويات.',
    'New Warehouse': 'مستودع جديد',
    'Name *': 'الاسم *',
    'e.g. Main Storage Vault': 'مثال: خزنة التخزين الرئيسية',
    'Address': 'العنوان',
    'e.g. 123 Storage Lane': 'مثال: ١٢٣ شارع التخزين',
    'Create': 'إنشاء',
    'Warehouses': 'المستودعات',
    'zones': 'مناطق',
    'bins': 'حاويات',
    'No warehouses configured yet.': 'لم يتم تكوين أي مستودعات بعد.',
    'Total Bins': 'إجمالي الحاويات',
    'Occupied': 'مشغولة',
    'Available': 'متاحة',
    'Occupancy': 'نسبة الإشغال',
    'Layout Optimization — Recommend Bin': 'تحسين التخطيط — توصية بحاوية',
    'Department name (e.g. Finance)': 'اسم القسم (مثال: المالية)',
    'Recommend': 'توصية',
    'Optimal': 'مثالية',
    'Distance to entry:': 'المسافة إلى المدخل:',
    'Score:': 'النتيجة:',
    'No empty bins available in this warehouse.': 'لا توجد حاويات فارغة في هذا المستودع.',
    'Layout:': 'التخطيط:',
    'No zones configured. Click "Add Zone" to begin creating your layout.': 'لم يتم تكوين أي مناطق. انقر "إضافة منطقة" لبدء إنشاء التخطيط.',
    'Add Zone': 'إضافة منطقة',
    'Add Aisle': 'إضافة ممر',
    'Add Shelf': 'إضافة رف',
    'Add Bin': 'إضافة حاوية',
    'aisles': 'ممرات',
    'shelves': 'رفوف',
    'occupied': 'مشغول',
    'No bins': 'لا توجد حاويات',
    'Add Spatial Zone': 'إضافة منطقة مكانية',
    'Add Storage Aisle': 'إضافة ممر تخزين',
    'Add Shelf Level': 'إضافة مستوى رف',
    'Add Warehouse Bin': 'إضافة حاوية مستودع',
    'Zone Name *': 'اسم المنطقة *',
    'e.g. Zone A, High Security Vault': 'مثال: المنطقة أ، الخزنة عالية الأمان',
    'e.g. Temperature controlled, financial records only': 'مثال: مكيّف الهواء، للسجلات المالية فقط',
    'Create Zone': 'إنشاء المنطقة',
    'Aisle Label *': 'تسمية الممر *',
    'e.g. A, B, 01, 02': 'مثال: أ، ب، ٠١، ٠٢',
    'Create Aisle': 'إنشاء الممر',
    'Shelf Level *': 'مستوى الرف *',
    'e.g. 1 (Ground), 2, 3': 'مثال: ١ (الأرضي)، ٢، ٣',
    'Max Box Capacity': 'الحد الأقصى لسعة الصناديق',
    'Create Shelf': 'إنشاء الرف',
    'Bin Code *': 'رمز الحاوية *',
    'e.g. A-1-1, BIN-042': 'مثال: أ-١-١، صندوق-٠٤٢',
    'Spatial X Coord': 'إحداثي X المكاني',
    'e.g. 1.5 (meters)': 'مثال: ١.٥ (متر)',
    'Spatial Y Coord': 'إحداثي Y المكاني',
    'e.g. 3.2 (meters)': 'مثال: ٣.٢ (متر)',
    'X and Y coordinates represent physical distances from the entry point. The spatial routing engine uses these to compute retrieval travel optimization.': 'تمثل إحداثيات X وY المسافات الفعلية من نقطة الدخول. يستخدم محرك التوجيه المكاني هذه البيانات لحساب أمثلية مسار الاسترداد.',
    'Create Bin': 'إنشاء الحاوية',
    'Creating...': 'جاري الإنشاء...',
    'Aisle': 'الممر',
    'Shelf Level': 'مستوى الرف',

    // ─── Import Page ───
    'Bulk CSV Import': 'استيراد CSV جماعي',
    'Import multiple inventory records at once using a structured CSV file.': 'استيراد عدة سجلات مخزون دفعة واحدة باستخدام ملف CSV منظّم.',
    'Download Template': 'تنزيل النموذج',
    'Step 1: Upload CSV File': 'الخطوة ١: رفع ملف CSV',
    'Click to upload or drag & drop': 'انقر للرفع أو اسحب وأفلت',
    'CSV files only • Max 10MB': 'ملفات CSV فقط • الحد الأقصى ١٠ ميجابايت',
    'Step 2: Map Columns': 'الخطوة ٢: تعيين الأعمدة',
    'CSV Column': 'عمود CSV',
    'Maps to Field': 'يعيّن إلى حقل',
    'Step 3: Review & Import': 'الخطوة ٣: مراجعة واستيراد',
    'Preview': 'معاينة',
    'Start Import': 'بدء الاستيراد',
    'Importing...': 'جاري الاستيراد...',
    'Import Results': 'نتائج الاستيراد',
    'Successfully imported': 'تم الاستيراد بنجاح',
    'records': 'سجلات',
    'Errors': 'أخطاء',
    'Import Another File': 'استيراد ملف آخر',
    '-- Skip Column --': '-- تخطي العمود --',
    'No file selected.': 'لم يتم تحديد ملف.',
    'Processing...': 'جاري المعالجة...',
    'Row': 'الصف',
    'Error': 'خطأ',

    // ─── Login Page ───
    'Sign in to manage your inventory': 'سجّل دخولك لإدارة مخزونك',
    'Email address': 'البريد الإلكتروني',
    'Password': 'كلمة المرور',
    'Sign In': 'تسجيل الدخول',
    'Signing in...': 'جاري تسجيل الدخول...',
    'Phase 1 build • Secured via JWT': 'الإصدار الأول • مؤمّن عبر JWT',
    'Invalid email or password. Please check your credentials.': 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من بيانات اعتمادك.',

    // ─── Admin Users Page ───
    'User Management': 'إدارة المستخدمين',
    'Manage system users and access control roles.': 'إدارة مستخدمي النظام وأدوار التحكم في الوصول.',
    'Manage system access, roles, and account status.': 'إدارة صلاحيات النظام والأدوار وحالة الحسابات.',
    'New User': 'مستخدم جديد',
    'Create New User': 'إنشاء مستخدم جديد',
    'Invite User': 'دعوة مستخدم',
    'Invite New User': 'دعوة مستخدم جديد',
    'Edit User': 'تعديل المستخدم',
    'Edit User Details': 'تعديل بيانات المستخدم',
    'Disable Account': 'تعطيل الحساب',
    'Enable Account': 'تفعيل الحساب',
    'Reset Security Keys': 'إعادة تعيين مفاتيح الأمان',
    'Full Name': 'الاسم الكامل',
    'Create User': 'إنشاء مستخدم',
    'No users found.': 'لم يتم العثور على مستخدمين.',
    'Deactivate': 'تعطيل',
    'Activate': 'تفعيل',
    'Reset Password': 'إعادة تعيين كلمة المرور',
    'New Password': 'كلمة المرور الجديدة',
    'Confirm Password': 'تأكيد كلمة المرور',
    'Update Password': 'تحديث كلمة المرور',
    'User ID (Employee ID / Username)': 'معرف المستخدم (رقم الموظف / اسم المستخدم)',
    'Email Address': 'عنوان البريد الإلكتروني',
    'Temporary Password': 'كلمة مرور مؤقتة',
    'Change Password (Optional)': 'تغيير كلمة المرور (اختياري)',
    'System Role': 'دور النظام',
    'Guest Expiration Date': 'تاريخ انتهاء صلاحية الضيف',
    'Scoped Data Access (Optional)': 'صلاحية وصول محدودة (اختياري)',
    'Restrict to Entity': 'تقييد إلى كيان',
    'Restrict to Department': 'تقييد إلى قسم',
    // 'All Entities': 'جميع الكيانات',
    // 'All Departments': 'جميع الأقسام',
    'Update User': 'تحديث المستخدم',
    'Send Invite': 'إرسال الدعوة',
    'Cancel': 'إلغاء',
    // 'Export CSV': 'تصدير CSV',
    // 'User': 'المستخدم',
    // 'Role': 'الدور',
    'Joined': 'تاريخ الانضمام',
    // 'ID:': 'المعرف:',
    'Leave blank to keep current': 'اتركه فارغاً للإبقاء على الحالي',
    'Min. 8 characters': 'الحد الأدنى ٨ أحرف',
    'System User': 'مستخدم النظام',
    'e.g. EMP001': 'مثال: EMP001',
    'name@example.com': 'الاسم@مثال.com',

    // ─── Admin Master Data Page ───
    'Master Data Management': 'إدارة البيانات الرئيسية',
    'Manage the core reference data for your system.': 'إدارة البيانات المرجعية الأساسية للنظام.',
    'Configure Entities, Departments, and Record Type Schemas.': 'تكوين الكيانات والأقسام ومخططات أنواع السجلات.',
    'Entity Types': 'أنواع الكيانات',
    'Entities': 'الكيانات',
    'Departments': 'الأقسام',
    'Locations': 'المواقع',
    'Record Types': 'أنواع السجلات',
    // 'Record Types & Schemas': 'أنواع السجلات والمخططات',
    'Categories': 'الفئات',
    'Retention Policies': 'سياسات الاحتفاظ',
    'Add Entity Type': 'إضافة نوع كيان',
    'Add Entity': 'إضافة كيان',
    'Add Department': 'إضافة قسم',
    'Add Location': 'إضافة موقع',
    'Add Record Type': 'إضافة نوع سجل',
    'Add Retention Policy': 'إضافة سياسة احتفاظ',
    'No items found.': 'لم يتم العثور على عناصر.',
    'Retention Years': 'سنوات الاحتفاظ',
    'Entity Code': 'رمز الكيان',
    // 'Schema': 'المخطط',
    'Fields': 'الحقول',
    'Add New Entity': 'إضافة كيان جديد',
    'Add New Department': 'إضافة قسم جديد',
    'Add New Entity Type': 'إضافة نوع كيان جديد',
    'Add New Record Type': 'إضافة نوع سجل جديد',
    'Add New Category': 'إضافة فئة جديدة',
    'Add New Item': 'إضافة عنصر جديد',
    // 'Name': 'الاسم',
    'Entity Code (2 Digits)': 'رمز الكيان (٢ أرقام)',
    'Select Entity Type...': 'اختر نوع الكيان...',
    'Select Entity...': 'اختر الكيان...',
    'Parent Entity': 'الكيان الأصلي',
    'Parent Category': 'الفئة الأصلية',
    'None (Root Category)': 'لا شيء (فئة جذرية)',
    'Enter name...': 'أدخل الاسم...',
    'Save Entry': 'حفظ الإدخال',
    'Update Entry': 'تحديث الإدخال',
    // 'Entity': 'الكيان',
    'Department': 'القسم',
    'Category': 'الفئة',
    // 'Schema': 'المخطط',
    // 'Record Types': 'أنواع السجلات',
    'Select a Record Type': 'اختر نوع سجل',
    'Pick a definition from the left to manage its metadata schema.': 'اختر تعريفاً من اليسار لإدارة مخطط بياناته الوصفية.',
    'New Type': 'نوع جديد',
    'Custom Fields': 'الحقول المخصصة',
    // 'Schema': 'المخطط',
    'Fields assigned to this record type definition.': 'الحقول المعينة لتعريف نوع السجل هذا.',
    'Add Field': 'إضافة حقل',
    'No custom fields defined for this record type.': 'لم يتم تعريف حقول مخصصة لنوع السجل هذا.',
    'Add Custom Field to': 'إضافة حقل مخصص إلى',
    'Display Label': 'التسمية التوضيحية',
    'e.g. Account Number': 'مثال: رقم الحساب',
    'Field Key (Permanent)': 'مفتاح الحقل (دائم)',
    'e.g. account_number': 'مثال: account_number',
    'Data Type': 'نوع البيانات',
    'Short Text': 'نص قصير',
    'Paragraph': 'فقرة',
    'Number': 'رقم',
    'Date': 'تاريخ',
    'Yes/No Toggle': 'تبديل نعم/لا',
    'Dropdown (Select One)': 'قائمة منسدلة (اختر واحداً)',
    'User Picker': 'منتقي المستخدم',
    'Web Link (URL)': 'رابط ويب (URL)',
    'Options (Comma separated)': 'الخيارات (مفصولة بفاصلة)',
    'e.g. High, Medium, Low': 'مثال: عالي، متوسط، منخفض',
    'Mandatory Field': 'حقل إلزامي',
    // 'Add Field': 'إضافة حقل',
    'Required': 'مطلوب',
    // 'Parent Entity': 'الكيان الأصلي',
    // 'Parent Category': 'الفئة الأصلية',
    'None (Root)': 'لا شيء (جذر)',
    'Active (status label)': 'نشط',
    // 'Parent Entity': 'الكيان الأصلي',
    // 'Parent Category': 'الفئة الأصلية',
    'None (Root Level)': 'لا شيء (المستوى الجذر)',
    // 'Select Entity Type...': 'اختر نوع الكيان...',
    'Rename Record Type': 'إعادة تسمية نوع السجل',
    'Delete Record Type': 'حذف نوع السجل',

    // ─── Admin Classification Page ───
    'Category Management': 'إدارة الفئات',
    'Manage the hierarchical classification taxonomy.': 'إدارة تصنيف التسلسل الهرمي.',
    'Classification & Tags': 'التصنيف والوسوم',
    'Manage category taxonomy and auto-classification logic.': 'إدارة تصنيف الفئات ومنطق التصنيف التلقائي.',
    'Auto-Classification Rules': 'قواعد التصنيف التلقائي',
    'Taxonomy Tree': 'شجرة التصنيف',
    'Add Category': 'إضافة فئة',
    'Category Name': 'اسم الفئة',
    'Add Rule': 'إضافة قاعدة',
    'Add Sub-category': 'إضافة فئة فرعية',
    'Add Sub-category (modal)': 'إضافة فئة فرعية',
    'Keyword': 'الكلمة المفتاحية',
    'Target Category': 'الفئة المستهدفة',
    'Field': 'الحقل',
    'No categories defined yet.': 'لم يتم تعريف أي فئات بعد.',
    'No auto-classification rules configured.': 'لم يتم تكوين قواعد تصنيف تلقائي.',
    'Apply Rules Now': 'تطبيق القواعد الآن',
    'Applying...': 'جاري التطبيق...',
    'records were automatically classified.': 'تم تصنيف السجلات تلقائياً.',
    'Rule Name': 'اسم القاعدة',
    'Condition': 'الشرط',
    'Priority': 'الأولوية',
    'Operator': 'المشغّل',
    'Value to match': 'القيمة للمطابقة',
    // 'Action': 'الإجراء',
    'Resulting Value': 'القيمة الناتجة',
    'Set Category': 'تعيين الفئة',
    'Add Tags': 'إضافة وسوم',
    'Contains': 'يحتوي على',
    'Equals': 'يساوي',
    'Starts With': 'يبدأ بـ',
    'Ends With': 'ينتهي بـ',
    'Description (field)': 'الوصف',
    'Location (field)': 'الموقع',
    'e.g. Identify Invoices': 'مثال: تحديد الفواتير',
    'e.g. INVOICE': 'مثال: INVOICE',
    'Select Category...': 'اختر الفئة...',
    'e.g. urgent, finance': 'مثال: عاجل، مالية',
    'Apply retroactively to existing records': 'تطبيق بأثر رجعي على السجلات الموجودة',
    'Save Category': 'حفظ الفئة',
    'Create Rule': 'إنشاء القاعدة',
    'Add Auto-Classification Rule': 'إضافة قاعدة تصنيف تلقائي',
    'Simulation Impact': 'تأثير المحاكاة',
    'records affected': 'سجلات متأثرة',
    'Discovery': 'الاكتشاف',
    'Pro Tip: Auto-Classification': 'نصيحة احترافية: التصنيف التلقائي',
    'Rules are processed instantly when a record is created or updated. High priority rules (larger numbers) are evaluated first. If multiple rules apply, their actions are cumulative.': 'تتم معالجة القواعد فوراً عند إنشاء سجل أو تحديثه. يتم تقييم القواعد ذات الأولوية العالية (الأرقام الأكبر) أولاً. إذا طُبّقت قواعد متعددة، فإن إجراءاتها تراكمية.',
    'e.g. Legal Documents': 'مثال: المستندات القانونية',

    // ─── Record Form ───
    'Create New Inventory Record': 'إنشاء سجل مخزون جديد',
    'Edit Inventory Record': 'تعديل سجل المخزون',
    'Box Barcode *': 'باركود الصندوق *',
    'File Barcode *': 'باركود الملف *',
    'Entity *': 'الكيان *',
    'Select entity...': 'اختر الكيان...',
    'Department *': 'القسم *',
    'Select department...': 'اختر القسم...',
    'Location *': 'الموقع *',
    'Select location...': 'اختر الموقع...',
    'Record Date *': 'تاريخ السجل *',
    'Record Type': 'نوع السجل',
    'Select record type...': 'اختر نوع السجل...',
    'Select category...': 'اختر الفئة...',
    'Tags (comma-separated)': 'الوسوم (مفصولة بفاصلة)',
    'e.g. vital, confidential, archive': 'مثال: حيوي، سري، أرشيف',
    'Save Record': 'حفظ السجل',
    'Saving...': 'جاري الحفظ...',

    // ─── Version History ───
    'No version history available.': 'لا يوجد تاريخ إصدارات متاح.',
    'Revert to this version': 'الرجوع إلى هذا الإصدار',
    'Reverting...': 'جاري الرجوع...',
    'Current': 'الحالي',
    'Changes': 'التغييرات',
    'Reverted successfully': 'تم الرجوع بنجاح',

    // ─── Navbar ───
    'Language': 'اللغة',
    'English': 'الإنجليزية',
    'Arabic': 'العربية',
    'Global Search': 'البحث العام',

    'Legal Hold Date': 'تاريخ التحفظ القانوني',
    'Complete Inventory': 'المخزون الكامل',
    'Audit Trails': 'مسارات التدقيق',
    'Compliance Report': 'تقرير الامتثال',
    'CSV (Spreadsheet)': 'CSV (جدول بيانات)',
    'PDF (Document)': 'PDF (مستند)',
    // 'Total Logs:': 'إجمالي السجلات:',
    // 'All': 'الكل',
    'FY2025 Q1 Vendor Invoices': 'فواتير الموردين للربع الأول لعام ٢٠٢٥',
    'John Doe Employment File': 'ملف توظيف جون دو',
    'Verification record for MissingGreenlet fix': 'سجل التحقق لإصلاح جرينليت المفقود',
    'Updated description for MissingGreenlet fix verification': 'الوصف المحدث للتحقق من إصلاح جرينليت المفقود',

    // ─── Records Page extra ───
    // 'Showing': 'عرض',
    // 'records matching criteria.': 'سجلات مطابقة للمعايير.',
    // 'Found': 'وُجد',
    // 'No records found': 'لم يتم العثور على سجلات',
    // 'Try adjusting your search terms or filters.': 'جرّب تعديل مصطلحات البحث أو الفلاتر.',
  }
}

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKeys) => string
  isRtl: boolean
  translate: (text: string | null | undefined) => string
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: (localStorage.getItem('app-language') as Language) || 'en',
  isRtl: (localStorage.getItem('app-language') === 'ar'),
  
  setLanguage: (language: Language) => {
    localStorage.setItem('app-language', language)
    
    const isRtl = language === 'ar'
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', language)
    
    // Apply RTL font for Arabic
    if (isRtl) {
      document.documentElement.style.setProperty('--font-family-override', '"Cairo", "Noto Sans Arabic", Arial, sans-serif')
    } else {
      document.documentElement.style.removeProperty('--font-family-override')
    }
    
    set({ language, isRtl })
  },
  
  t: (key: TranslationKeys) => {
    const lang = get().language
    return translations[lang][key] || translations['en'][key] || String(key)
  },

  translate: (text: string | null | undefined) => {
    if (!text) return ''
    const currentLang = get().language
    if (currentLang === 'en') return text

    const trimmed = String(text).trim()
    
    // Check main translations dictionary safely
    if (trimmed in translations.ar) {
      return translations.ar[trimmed as TranslationKeys]
    }
    
    // Check record text translations dictionary
    if (recordTextTranslations.ar[trimmed]) {
      return recordTextTranslations.ar[trimmed]
    }

    // Check case-insensitive match
    const lowerTrimmed = trimmed.toLowerCase()
    for (const [key, value] of Object.entries(recordTextTranslations.ar)) {
      if (key.toLowerCase() === lowerTrimmed) {
        return value;
      }
    }

    // Try a simple word-by-word replacement for composite strings
    let translated = trimmed
    for (const [key, value] of Object.entries(recordTextTranslations.ar)) {
      if (key.length > 2 && translated.toLowerCase().includes(key.toLowerCase())) {
        const regex = new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi')
        translated = translated.replace(regex, value)
      }
    }

    // Translate English numerals to Arabic eastern digits
    return translated.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
  }
}))

// Initialize direction on load
if (typeof window !== 'undefined') {
  const initialLang = localStorage.getItem('app-language') || 'en'
  const isRtl = initialLang === 'ar'
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
  document.documentElement.setAttribute('lang', initialLang)
  if (isRtl) {
    document.documentElement.style.setProperty('--font-family-override', '"Cairo", "Noto Sans Arabic", Arial, sans-serif')
  }
}
