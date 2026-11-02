/**
 * Page Object Model for DataReady AI Android application screens
 */

class MobileScreen {
  constructor(client) {
    this.client = client;
  }

  async findByText(text) {
    return await this.client.$(`//*[@text="${text}"]`);
  }

  async findByAccessibilityId(id) {
    return await this.client.$(`~${id}`);
  }

  async isDisplayed(selector) {
    try {
      const el = await this.client.$(selector);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }
}

class WelcomeScreen extends MobileScreen {
  get getStartedBtn() { return this.client.$('//*[@text="Get Started" or @text="GET STARTED"]'); }
  get signInLink() { return this.client.$('//*[@text="Sign In" or @text="SIGN IN"]'); }
}

class LoginScreen extends MobileScreen {
  get emailInput() { return this.client.$('//android.widget.EditText[contains(@text, "email") or contains(@hint, "email")]'); }
  get passwordInput() { return this.client.$('//android.widget.EditText[contains(@text, "password") or @password="true"]'); }
  get signInButton() { return this.client.$('//*[@text="Sign In" and @clickable="true"]'); }
  get forgotPasswordLink() { return this.client.$('//*[@text="Forgot password?"]'); }
  get unverifiedNotice() { return this.client.$('//*[contains(@text, "Unverified") or contains(@text, "verify-otp")]'); }
}

class SignupScreen extends MobileScreen {
  get emailInput() { return this.client.$('//android.widget.EditText[contains(@text, "email") or contains(@hint, "email")]'); }
  get passwordInput() { return this.client.$('//android.widget.EditText[@password="true"]'); }
  get signUpButton() { return this.client.$('//*[@text="Create Account" or @text="Sign Up"]'); }
}

class DashboardScreen extends MobileScreen {
  get totalDatasetsCard() { return this.client.$('//*[contains(@text, "Total Datasets")]'); }
  get qualityScoreCard() { return this.client.$('//*[contains(@text, "Avg Quality Score")]'); }
  get mlReadinessCard() { return this.client.$('//*[contains(@text, "Avg ML Readiness")]'); }
  get uploadButton() { return this.client.$('//*[@text="Upload" or contains(@text, "Upload Dataset")]'); }
}

class DatasetsScreen extends MobileScreen {
  get searchInput() { return this.client.$('//android.widget.EditText[contains(@hint, "Search")]'); }
  get datasetList() { return this.client.$('//android.widget.ScrollView'); }
}

class AnalysisScreen extends MobileScreen {
  get qualityBadge() { return this.client.$('//*[contains(@text, "Quality Score")]'); }
  get readinessBadge() { return this.client.$('//*[contains(@text, "ML Readiness")]'); }
  get recommendationsSection() { return this.client.$('//*[contains(@text, "Recommendations")]'); }
}

class TransformationsScreen extends MobileScreen {
  get removeDuplicatesBtn() { return this.client.$('//*[@text="Remove Duplicates"]'); }
  get dropMissingBtn() { return this.client.$('//*[@text="Drop Missing Values"]'); }
  get applyBtn() { return this.client.$('//*[@text="Apply Transformation"]'); }
}

class ChatScreen extends MobileScreen {
  get messageInput() { return this.client.$('//android.widget.EditText[contains(@hint, "Ask")]'); }
  get sendButton() { return this.client.$('//android.view.ViewGroup[@clickable="true"]'); }
}

class SettingsScreen extends MobileScreen {
  get apiKeySetting() { return this.client.$('//*[contains(@text, "API Key") or contains(@text, "Gemini")]'); }
  get signOutBtn() { return this.client.$('//*[contains(@text, "Sign Out") or contains(@text, "Logout")]'); }
}

module.exports = {
  WelcomeScreen,
  LoginScreen,
  SignupScreen,
  DashboardScreen,
  DatasetsScreen,
  AnalysisScreen,
  TransformationsScreen,
  ChatScreen,
  SettingsScreen
};
