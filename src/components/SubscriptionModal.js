import React from 'react';
import './SubscriptionModal.css';

const SubscriptionModal = ({ isOpen, onClose, userEmail }) => {
  if (!isOpen) return null;

  const plans = [
    {
      name: 'Pro',
      price: '$9.99',
      period: '/month',
      description: 'Perfect for students and researchers',
      features: [
        'Access to basic placement data',
        'Standard search filters',
        'Email support',
        'Monthly data updates'
      ],
      buttonText: 'Choose Pro',
      popular: false,
      dodoUrl: 'https://test.checkout.dodopayments.com/buy/pdt_0DpfFd4bahexU2PQMkJnf?quantity=1&redirect_url=https%3A%2F%2Fwww.pandainuniv.com%2F'
    },
    {
      name: 'Premium',
      price: '$19.99',
      period: '/month',
      description: 'Best for academic professionals',
      features: [
        'Everything in Pro',
        'Advanced analytics',
        'Premium support',
        'Weekly data updates',
        'Export to CSV/Excel',
        'Industry insights'
      ],
      buttonText: 'Choose Premium',
      popular: true,
      dodoUrl: 'https://test.checkout.dodopayments.com/buy/pdt_W8xr6mtUJ3PyG3E4GYlf3?quantity=1&redirect_url=https%3A%2F%2Fwww.pandainuniv.com%2F'
    },
    {
      name: 'Lifetime',
      price: '$299',
      period: 'one-time',
      description: 'Unlimited access forever',
      features: [
        'Everything in Premium',
        'Lifetime access',
        'Priority support',
        'Real-time data updates',
        'Advanced comparison tools',
        'Custom reports',
        'API access'
      ],
      buttonText: 'Choose Lifetime',
      popular: false,
      dodoUrl: 'https://test.checkout.dodopayments.com/buy/pdt_6p17rVL1gE7LkMgarufvr?quantity=1&redirect_url=https%3A%2F%2Fwww.pandainuniv.com%2F'
    }
  ];

  const handlePlanSelect = (baseUrl) => {
    if (!userEmail) {
      alert('Please log in to continue with payment');
      return;
    }
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}` +
      `email=${encodeURIComponent(userEmail)}` +
      `&disableEmail=true` +
      `&metadata_userEmail=${encodeURIComponent(userEmail)}`;
    
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="subscription-modal-overlay" onClick={onClose}>
      <div className="subscription-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Choose Your Plan</h2>
          <p>Unlock the full potential of PandainUniv with our premium features</p>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div 
              key={plan.name} 
              className={`pricing-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="price-container">
                  <span className="price">{plan.price}</span>
                  <span className="period">{plan.period}</span>
                </div>
                <p className="plan-description">{plan.description}</p>
              </div>
              
              <ul className="features-list">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex}>
                    <span className="check-icon">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                className={`plan-button ${plan.popular ? 'popular-button' : ''}`}
                onClick={() => handlePlanSelect(plan.dodoUrl)}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
        
        <div className="modal-footer">
          <p>All plans include a 30-day money-back guarantee</p>
          <div className="security-badges">
            <span>🔒 Secure Payment</span>
            <span>💳 All Major Cards Accepted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
