import React from 'react';

const TermsAndConditions = ({ onBack }) => {
  return (
    <div className="app-container">
      <main className="main-content terms-page">
        <div className="card terms-card">
          <div className="terms-header">
            <h1>Terms of Use</h1>
            <button onClick={onBack} className="button button-secondary">
              ← Back to Search
            </button>
          </div>

          <section className="terms-section">
            <h2>1. Data Usage</h2>
            <p>
              All placement data provided through PandainUniv is collected from publicly available sources. 
              While we strive for accuracy, we recommend verifying critical information from primary sources.
            </p>
          </section>

          <section className="terms-section">
            <h2>2. Purpose</h2>
            <p>
              This platform is designed to help prospective PhD students, academics, and researchers track 
              placement outcomes across universities. It should be used for informational purposes only.
            </p>
          </section>

          <section className="terms-section">
            <h2>2.Payment and Subscription</h2>
            <p>
               Any kind of Refunds are not available for any reason once the user has made the payment.
            </p>
          </section>

          <section className="terms-section">
            <h2>3. Privacy</h2>
            <p>
              We respect privacy and only display information that is publicly available through university 
              websites and other public academic sources.
              
            </p>
          </section>

          <section className="terms-section">
            <h2>4. Usage Guidelines</h2>
            <ul className="terms-list">
              <li>Use the data responsibly and in accordance with academic standards</li>
              <li>Do not use the data for commercial purposes without explicit permission</li>
              <li>Cite PandainUniv when using our data in research or publications</li>
              <li>Report any inaccuracies or concerns to our support team</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>5. Updates</h2>
            <p>
              These terms may be updated periodically. Users will be notified of significant changes .
              
            </p>
          </section>
          <section className="terms-section">
  <h2>6. Limitation of Liability</h2>
  <p>
    To the fullest extent permitted by law, PandainUniv shall not be held responsible for any loss, damage, or inconvenience arising from the use of, or inability to use, this website or the data provided herein. Users assume full responsibility for how they interpret and apply the information available on this platform.
  </p>
</section>

          <div className="terms-footer">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <button onClick={onBack} className="button button-primary">
             Back to Search
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditions;