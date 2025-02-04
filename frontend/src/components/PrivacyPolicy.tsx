import { usePageTitle } from '../hooks/usePageTitle';
import { Link } from 'react-router-dom';
import Layout from './Layout';

const PrivacyPolicy: React.FC = () => {
  usePageTitle('Privacy Policy');

  return (
    <Layout>
      <div className="pt-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="mb-2">
            <Link 
              to="/"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              ← Back to Home
            </Link>
          </nav>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <div className="prose dark:prose-invert max-w-none space-y-12">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Information We Collect
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  When you use Code Quest, we collect information that you provide directly to us. This includes your GitHub account information, such as your username, email address, and profile data, which we use to create and manage your account. For newsletter subscribers, we collect your email address to send you updates and communications.
                </p>
                <p>
                  We also collect usage data and preferences as you interact with our platform. This includes information about how you use Code Quest, your preferences, and settings. Additionally, we maintain records of your feedback and communications with us to improve our services and assist you better.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. How We Use Your Information
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Our primary goal in collecting your information is to provide you with a seamless and personalized experience. We use your data to maintain and improve our services, ensuring that Code Quest continues to meet your needs and expectations. This includes processing and completing transactions when necessary.
                </p>
                <p>
                  We also use your information to send important technical notices and support messages, keeping you informed about system updates, maintenance, and any issues that may affect your use of the platform. When you reach out to us, we use your information to respond to your comments and questions effectively.
                </p>
                <p>
                  Additionally, we may use your contact information to communicate with you about our products, services, and events that we believe may be of interest to you, always with the goal of enhancing your experience with Code Quest.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Information Sharing
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  We take your privacy seriously and maintain strict controls over your personal information. We do not share your data with third parties except in specific circumstances where it is necessary for providing our services. This includes sharing information with your explicit consent, when required to comply with legal obligations, or to protect our rights and prevent fraud.
                </p>
                <p>
                  In some cases, we may share your information with trusted service providers who assist in our operations. These providers are bound by strict confidentiality agreements and are prohibited from using your personal information for any other purposes.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Data Security
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage. Our security measures include encryption, access controls, and regular security assessments to ensure your data remains protected at all times.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Contact Us
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                If you have any questions about this Privacy Policy or how we handle your personal information, please don't hesitate to contact us at{' '}
                <a href="mailto:privacy@codequest.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  privacy@codequest.com
                </a>. We are committed to addressing your concerns and ensuring your privacy is protected.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy; 