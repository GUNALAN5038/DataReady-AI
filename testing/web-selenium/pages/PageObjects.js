const { By } = require('selenium-webdriver');
const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.emailInput = By.css('input#email, input[type="email"]');
    this.passwordInput = By.css('input#password, input[type="password"]');
    this.submitButton = By.css('button[type="submit"]');
    this.errorAlert = By.css('[role="alert"], .text-rose-600, .bg-rose-50');
    this.forgotPasswordLink = By.css('a[href="/forgot-password"]');
    this.signupLink = By.css('a[href="/signup"]');
    this.unverifiedButton = By.css('a[href*="/verify-otp"]');
  }

  async open() {
    await this.navigateTo('/login');
  }

  async login(email, password) {
    await this.type(this.emailInput, email);
    await this.type(this.passwordInput, password);
    await this.click(this.submitButton);
  }

  async getErrorMessage() {
    return await this.getText(this.errorAlert);
  }

  async isUnverifiedPromptPresent() {
    return await this.isElementPresent(this.unverifiedButton);
  }
}

class SignupPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.emailInput = By.css('input#email, input[type="email"]');
    this.passwordInput = By.css('input#password, input[type="password"]');
    this.submitButton = By.css('button[type="submit"]');
    this.loginLink = By.css('a[href="/login"]');
  }

  async open() {
    await this.navigateTo('/signup');
  }

  async signup(email, password) {
    await this.type(this.emailInput, email);
    await this.type(this.passwordInput, password);
    await this.click(this.submitButton);
  }
}

class ForgotPasswordPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.emailInput = By.css('input#email, input[type="email"]');
    this.submitButton = By.css('button[type="submit"]');
    this.backToLoginLink = By.css('a[href="/login"]');
  }

  async open() {
    await this.navigateTo('/forgot-password');
  }

  async requestReset(email) {
    await this.type(this.emailInput, email);
    await this.click(this.submitButton);
  }
}

class DashboardPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.navDashboard = By.css('a[href="/dashboard"]');
    this.navDatasets = By.css('a[href="/datasets"]');
    this.navUpload = By.css('a[href="/upload"]');
    this.navChat = By.css('a[href="/chat"]');
    this.navSettings = By.css('a[href="/settings"]');
    this.metricsGrid = By.css('.grid, [data-testid="metrics-grid"]');
  }

  async open() {
    await this.navigateTo('/dashboard');
  }

  async hasNavigationElements() {
    const d = await this.isElementPresent(this.navDashboard);
    const ds = await this.isElementPresent(this.navDatasets);
    const u = await this.isElementPresent(this.navUpload);
    return d || ds || u;
  }
}

class DatasetsPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.uploadButton = By.css('a[href="/upload"], button:has-text("Upload")');
    this.table = By.css('table, [role="table"]');
  }

  async open() {
    await this.navigateTo('/datasets');
  }
}

class UploadPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.fileInput = By.css('input[type="file"]');
    this.dropzone = By.css('[role="presentation"], .border-dashed');
  }

  async open() {
    await this.navigateTo('/upload');
  }
}

class AnalysisPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
  }

  async openForDataset(id) {
    await this.navigateTo(`/datasets/${id}`);
  }
}

class TransformationsPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
  }

  async openForDataset(id) {
    await this.navigateTo(`/datasets/${id}?tab=transform`);
  }
}

class DatasetDetailPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.insightsTab = By.css('button[value="insights"], [data-value="insights"]');
    this.readinessTab = By.css('button[value="readiness"], [data-value="readiness"]');
    this.recommendationsTab = By.css('button[value="recommendations"], [data-value="recommendations"]');
    this.previewTab = By.css('button[value="preview"], [data-value="preview"]');
    this.qualityTab = By.css('button[value="quality"], [data-value="quality"]');
    this.transformTab = By.css('button[value="transform"], [data-value="transform"]');
    this.compareTab = By.css('button[value="compare"], [data-value="compare"]');
    this.historyTab = By.css('button[value="history"], [data-value="history"]');
    this.chatTab = By.css('button[value="chat"], [data-value="chat"]');
    this.exportDropdown = By.css('button:has-text("Export"), [data-testid="export-dropdown"], button:has(.lucide-download)');
    this.exportCsvButton = By.css('button:has-text("CSV"), a[href*="format=csv"]');
    this.exportXlsxButton = By.css('button:has-text("Excel"), a[href*="format=xlsx"]');
    this.mlReadinessGauge = By.css('[data-testid="ml-readiness-gauge"], .text-xl:has-text("ML Readiness")');
    this.missingValuesSection = By.css('[data-testid="missing-values"], :has-text("Missing Values")');
    this.duplicatesSection = By.css('[data-testid="duplicates"], :has-text("Duplicate Rows")');
    this.outliersSection = By.css('[data-testid="outliers"], :has-text("Outliers")');
    this.previewTable = By.css('table, [data-testid="preview-table"]');
    this.revertButton = By.css('button:has-text("Revert"), button:has-text("Rollback")');
  }

  async open(datasetId) {
    await this.navigateTo(`/datasets/${datasetId}`);
  }
}

class ChatPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.chatInput = By.css('textarea, input[placeholder*="Ask"]');
    this.sendButton = By.css('button[type="submit"]');
  }

  async open() {
    await this.navigateTo('/chat');
  }
}

class SettingsPage extends BasePage {
  constructor(driver, baseUrl) {
    super(driver, baseUrl);
    this.keysLink = By.css('a[href="/settings/keys"]');
    this.securityLink = By.css('a[href="/settings/security"]');
    this.apiKeyInput = By.css('input[name="apiKey"], input[placeholder*="key"]');
    this.saveKeyButton = By.css('button:has-text("Save Key"), button:has-text("Add Key")');
    this.keyPreviewList = By.css('[data-testid="keys-list"], table');
  }

  async open() {
    await this.navigateTo('/settings');
  }
}

module.exports = {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  DashboardPage,
  DatasetsPage,
  UploadPage,
  AnalysisPage,
  TransformationsPage,
  DatasetDetailPage,
  ChatPage,
  SettingsPage
};


