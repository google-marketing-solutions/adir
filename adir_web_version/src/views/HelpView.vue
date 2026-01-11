<template>
  <div class="help-container">
    <div class="help-content">
      <header class="help-header">
        <h1 class="main-headline">Adir Help Center</h1>
        <p class="sub-headline">
          Your guide to AI-powered Google Ads image generation
        </p>
      </header>

      <section class="help-section">
        <h2>Overview</h2>
        <p>
          Adir (Ads Dynamic Image Renderer) is a powerful tool designed to help
          you generate and manage high-quality image assets for your Google Ads
          campaigns using Vertex AI and Google Ads API.
        </p>
      </section>

      <section class="help-section">
        <h2>Setup Guide</h2>
        <p>Follow these steps to set up your environment and start using Adir.</p>
        <div class="timeline">
          <!-- Step 1: GCP Project -->
          <div class="timeline-item">
            <div class="timeline-marker">1</div>
            <div class="timeline-content">
              <h3>GCP Project Setup</h3>
              <p>
                Ensure you have a Google Cloud Platform (GCP) project with <strong>billing enabled</strong>.
              </p>
              <div class="action-links">
                <a href="https://console.cloud.google.com/projectcreate" target="_blank" class="action-link">
                  <span class="icon">➕</span> Create Project
                </a>
              </div>
            </div>
          </div>

          <!-- Step 2: Enable APIs -->
          <div class="timeline-item">
            <div class="timeline-marker">2</div>
            <div class="timeline-content">
              <h3>Enable Required APIs</h3>
              <p>Enable the <strong>Vertex AI API</strong> and the <strong>Google Ads API</strong> for your project.</p>
              <div class="action-links">
                <a href="https://console.cloud.google.com/marketplace/product/google/aiplatform.googleapis.com" target="_blank" class="action-link">
                  <span class="icon">🧠</span> Vertex AI API
                </a>
                <a href="https://console.cloud.google.com/marketplace/product/google/googleads.googleapis.com" target="_blank" class="action-link">
                  <span class="icon">📈</span> Google Ads API
                </a>
              </div>
            </div>
          </div>

          <!-- Step 3: OAuth Consent Screen -->
          <div class="timeline-item">
            <div class="timeline-marker">3</div>
            <div class="timeline-content">
              <h3>Configure OAuth Consent Screen</h3>
              <p>
                Configure the OAuth consent screen. Set it to <strong>Internal</strong> if you are within a Google Workspace, or <strong>External</strong> for testing.
                Add the <strong>Google Ads API</strong> scope.
              </p>
              <div class="action-links">
                <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" class="action-link">
                  <span class="icon">📝</span> Configure Consent Screen
                </a>
              </div>
            </div>
          </div>

          <!-- Step 4: Grant Permissions -->
          <div class="timeline-item">
            <div class="timeline-marker">4</div>
            <div class="timeline-content">
              <h3>Grant IAM Permissions</h3>
              <p>
                Ensure that all users running Adir have the following roles granted in <strong>IAM & Admin</strong>:
              </p>
              <ul class="settings-list" style="margin-bottom: 16px;">
                <li><strong>Storage Admin</strong> (<code>roles/storage.admin</code>)</li>
                <li><strong>Vertex AI User</strong> (<code>roles/aiplatform.user</code>)</li>
              </ul>
              <div class="action-links">
                <a href="https://console.cloud.google.com/iam-admin/iam" target="_blank" class="action-link">
                  <span class="icon">👥</span> IAM & Admin
                </a>
              </div>
            </div>
          </div>

          <!-- Step 5: OAuth Client ID -->
          <div class="timeline-item">
            <div class="timeline-marker">5</div>
            <div class="timeline-content">
              <h3>Create OAuth Client ID</h3>
              <p>
                Create an OAuth 2.0 Client ID of type <strong>Web application</strong>.
              </p>
              <div class="code-block">
                <p><strong>Authorized JavaScript origins:</strong></p>
                <code>https://adir-prod.web.app</code>
                <p><strong>Authorized redirect URIs:</strong></p>
                <code>https://adir-prod.web.app/</code>
              </div>
              <p class="note">
                Copy the <strong>Client ID</strong>. You will need to enter this on the Sign In page.
              </p>
              <div class="action-links">
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="action-link">
                  <span class="icon">🔑</span> Create Credentials
                </a>
              </div>
            </div>
          </div>

          <!-- Step 6: Configure Settings -->
          <div class="timeline-item">
            <div class="timeline-marker">6</div>
            <div class="timeline-content">
              <h3>Configure Settings</h3>
              <p>
                After logging in with your Client ID, go to the <strong>Settings</strong> tab to enter remaining details:
              </p>
              <ul class="settings-list">
                <li><strong>Cloud Project ID:</strong> The ID of your GCP project.</li>
                <li><strong>GCS Bucket:</strong> Create a bucket for storing generated images. <a href="https://console.cloud.google.com/storage/browser" target="_blank" style="color: #60a5fa; text-decoration: underline;">Open GCS</a>
                  <ul style="list-style-type: circle; margin-left: 20px; margin-top: 4px; font-size: 0.95rem; color: #94a3b8;">
                    <li>We recommend a separate bucket per account/user.</li>
                    <li>Generated images are uploaded here. Removing them from preview deletes them from the bucket.</li>
                    <li>Uploaded images are moved to an <code>/uploaded</code> directory.</li>
                  </ul>
                </li>
                <li><strong>MCC ID:</strong> A Google Ads Manager Account (MCC) you have direct access to.</li>
                <li><strong>Customer ID:</strong> A child account under the specified MCC.</li>

                <li><strong>Google Ads Developer Token:</strong> Basic or Standard level access.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="help-section">
        <h2>Tool Overview</h2>
        <div class="tool-parts-container">
          <div class="tool-parts">
            <div class="part">
              <div class="part-icon">🗑️</div>
              <h3>Asset Removal</h3>
              <p>
                Identify and remove underperforming assets from your campaigns.
              </p>
            </div>
            <div class="part-arrow">→</div>
            <div class="part">
              <div class="part-icon">✨</div>
              <h3>Asset Generation</h3>
              <p>
                Generate new images based on existing assets or creative
                concepts using Vertex AI.
              </p>
            </div>
            <div class="part-arrow">→</div>
            <div class="part">
              <div class="part-icon">👁️</div>
              <h3>Asset Preview & Edit</h3>
              <p>
                Preview, single edit or batch edit, and manage generated assets before uploading them to
                Google Ads.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer class="help-footer">
        <p>
          <strong>Need More Help? Join Our Google Group!</strong><br />
          If you have further questions or require direct support, please feel free to join the
          <a href="https://groups.google.com/g/adir_pmax_image_generation" target="_blank">Adir Google group</a>.
        </p>
        <p class="disclaimer">
          Disclaimer: This is not an official Google Product.
        </p>
      </footer>

      <div class="back-to-login">
        <router-link to="/login" class="back-link">Back to Login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// No special logic needed for this static page
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap");

.help-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  width: 100%;
  background-color: #0f172a; /* Slate 900 */
  color: #e2e8f0; /* Slate 200 */
  padding: 60px 20px;
  box-sizing: border-box;
  overflow-y: auto;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}

.help-content {
  background: #1e293b; /* Slate 800 */
  padding: 50px;
  border-radius: 16px;
  border: 1px solid #334155; /* Slate 700 */
  width: 100%;
  max-width: 850px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.help-header {
  text-align: center;
  margin-bottom: 50px;
  border-bottom: 1px solid #334155;
  padding-bottom: 30px;
}

.main-headline {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-bottom: 16px;
  background: linear-gradient(to right, #60a5fa, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% auto;
  animation: shine 5s linear infinite;
}

@keyframes shine {
  to {
    background-position: 200% center;
  }
}

.sub-headline {
  font-size: 1.5rem;
  font-weight: 300;
  color: #94a3b8; /* Slate 400 */
}

.help-section {
  margin-bottom: 45px;
}

.help-section h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9; /* Slate 100 */
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.help-section h2::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 24px;
  background: #60a5fa;
  border-radius: 4px;
  margin-right: 12px;
}

.help-section p {
  font-size: 1.125rem;
  line-height: 1.75;
  color: #cbd5e1; /* Slate 300 */
  margin-bottom: 20px;
}

/* Timeline Styles */
.timeline {
  position: relative;
  margin-top: 30px;
  padding-left: 30px;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 14px;
  width: 2px;
  background: #334155;
}

.timeline-item {
  position: relative;
  margin-bottom: 40px;
}

.timeline-marker {
  position: absolute;
  left: -30px;
  top: 0;
  width: 30px;
  height: 30px;
  background: #60a5fa;
  color: #0f172a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  z-index: 1;
  box-shadow: 0 0 0 4px #1e293b;
}

.timeline-content {
  background: #273549;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #334155;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.timeline-content h3 {
  color: #f1f5f9;
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.timeline-content p {
  font-size: 1.1rem;
  color: #cbd5e1;
  line-height: 1.6;
  margin-bottom: 16px;
}

.action-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.action-link {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  background: #334155;
  color: #f1f5f9;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.action-link:hover {
  background: #475569;
  border-color: #60a5fa;
  transform: translateY(-2px);
}

.action-link .icon {
  margin-right: 8px;
  font-size: 1.2rem;
}

.code-block {
  background: #0f172a;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #334155;
  margin: 16px 0;
}

.code-block p {
  font-size: 0.9rem;
  color: #94a3b8;
  margin-bottom: 4px;
}

.code-block code {
  display: block;
  font-family: 'Courier New', Courier, monospace;
  color: #60a5fa;
  background: #1e293b;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 0.95rem;
  word-break: break-all;
}

.note {
  font-style: italic;
  color: #94a3b8 !important;
  font-size: 1rem !important;
}

.settings-list {
  list-style-type: disc;
  margin-left: 20px;
  color: #cbd5e1;
}

.settings-list li {
  margin-bottom: 8px;
  font-size: 1.05rem;
}

.tool-parts-container {
  overflow-x: auto;
  padding-bottom: 16px;
}

.tool-parts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 600px;
  gap: 12px;
  margin-top: 24px;
}

.part {
  background: #273549;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid #334155;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.part-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.part-arrow {
  font-size: 2rem;
  color: #475569;
  font-weight: bold;
}

.part::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(to right, #60a5fa, #a78bfa);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.part:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  border-color: #60a5fa;
}

.part:hover::before {
  opacity: 1;
}

.part h3 {
  color: #f1f5f9;
  margin-bottom: 12px;
  font-size: 1.25rem;
  font-weight: 700;
}

.part p {
  font-size: 1rem;
  color: #cbd5e1;
  margin-bottom: 0;
  line-height: 1.6;
  font-weight: 500;
}

.help-footer {
  margin-top: 60px;
  padding-top: 30px;
  border-top: 1px solid #334155;
  text-align: center;
  color: #94a3b8;
}

.help-footer a {
  color: #60a5fa;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.help-footer a:hover {
  color: #93c5fd;
  text-decoration: underline;
}

.disclaimer {
  font-size: 0.9rem;
  font-style: italic;
  margin-top: 16px;
  color: #64748b;
}

.back-to-login {
  margin-top: 40px;
  text-align: center;
}

.back-link {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background-color: #334155;
  color: #f1f5f9;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.back-link:hover {
  background-color: #475569;
  border-color: #64748b;
  transform: translateX(-4px);
}

.back-link::before {
  content: "←";
  margin-right: 8px;
  font-size: 1.1rem;
}
</style>
