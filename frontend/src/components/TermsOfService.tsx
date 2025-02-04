import { usePageTitle } from '../hooks/usePageTitle';
import { Link } from 'react-router-dom';
import Layout from './Layout';

const TermsOfService: React.FC = () => {
  usePageTitle('Terms of Service');

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

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <div className="prose dark:prose-invert max-w-none space-y-12">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                By accessing and using Code Quest, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Use License
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  Permission is granted to temporarily access Code Quest for personal, non-commercial use only. This is the grant of a license, not a transfer of title, and under this license you are restricted from modifying or copying the materials, using the materials for any commercial purpose, attempting to decompile or reverse engineer any software contained on Code Quest's website, removing any copyright or other proprietary notations from the materials, or transferring the materials to another person or "mirror" the materials on any other server.
                </p>
                <p>
                  This license shall automatically terminate if you violate any of these restrictions and may be terminated by Code Quest at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession whether in electronic or printed format.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. User Obligations
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  As a user of Code Quest, you are required to provide accurate and complete information when creating your account and keep this information updated. You are responsible for maintaining the security of your account and password. Code Quest cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
                </p>
                <p>
                  You agree not to use the service for any illegal purposes or to conduct any unlawful activity, including but not limited to fraud, embezzlement, money laundering, or identity theft. You must respect the intellectual property rights of others and not upload, post, or submit content that infringes on any patents, trademarks, trade secrets, copyrights, or other proprietary rights.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Disclaimer
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                The materials on Code Quest's website are provided on an 'as is' basis. Code Quest makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights. Furthermore, Code Quest does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its website or otherwise relating to such materials or on any sites linked to this site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Limitations
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                In no event shall Code Quest or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use Code Quest's materials, even if Code Quest or a Code Quest authorized representative has been notified orally or in writing of the possibility of such damage. Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability for consequential or incidental damages, these limitations may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Contact Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                If you have any questions or concerns about these Terms of Service, please reach out to our legal team at{' '}
                <a href="mailto:legal@codequest.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  legal@codequest.com
                </a>. We are committed to addressing your inquiries and ensuring clear understanding of our terms.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TermsOfService; 