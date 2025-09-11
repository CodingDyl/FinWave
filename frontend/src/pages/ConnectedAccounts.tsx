import React, { useState, useEffect } from 'react';
import { Plus, Building2, CreditCard, Globe, CheckCircle, AlertCircle, ExternalLink, Star } from 'lucide-react';
import { 
  listConnectedAccounts, 
  createExpressAccount, 
  createAccountLink, 
  addBankAccount, 
  listExternalAccounts, 
  setDefaultAccount,
  getSupportedCurrencies 
} from '../lib/api';
import type { ConnectedAccount } from '../types/index';
import type { BankAccountCreate } from '../types/index';
import type { ExternalAccount } from '../types/index';
import type { Currency } from '../types/index';
import { useToast } from '../components/toast/ToastProvider';

const ConnectedAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [externalAccounts, setExternalAccounts] = useState<Record<string, ExternalAccount[]>>({});
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsData, currenciesData] = await Promise.all([
        listConnectedAccounts(),
        getSupportedCurrencies()
      ]);
      
      setAccounts(accountsData);
      setCurrencies(currenciesData.currencies);
      
      // Load external accounts for each connected account
      const externalAccountsData: Record<string, ExternalAccount[]> = {};
      for (const account of accountsData) {
        try {
          const external = await listExternalAccounts(account.id);
          externalAccountsData[account.id] = external.external_accounts || [];
        } catch (error) {
          console.error(`Failed to load external accounts for ${account.id}:`, error);
          externalAccountsData[account.id] = [];
        }
      }
      setExternalAccounts(externalAccountsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error({
        title: "Error",
        description: "Failed to load connected accounts"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpressAccount = async (formData: any) => {
    try {
      const account = await createExpressAccount(formData);
      setAccounts(prev => [...prev, account]);
      
      // Create account link for onboarding
      const linkData = await createAccountLink(account.id);
      window.open(linkData.url, '_blank');
      
      toast.success({
        title: "Account Created",
        description: "Express account created. Complete onboarding in the new window."
      });
      
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('Failed to create Express account:', error);
      toast.error({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create Express account"
      });
    }
  };

  const handleAddBankAccount = async (accountId: string, bankData: BankAccountCreate) => {
    try {
      await addBankAccount(accountId, bankData);
      await loadData(); // Reload to get updated external accounts
      
      toast.success({
        title: "Bank Account Added",
        description: "Bank account successfully added to connected account"
      });
      
      setShowBankModal(false);
    } catch (error: any) {
      console.error('Failed to add bank account:', error);
      toast.error({
        title: "Error",
        description: error.response?.data?.detail || "Failed to add bank account"
      });
    }
  };

  const handleSetDefault = async (accountId: string) => {
    try {
      await setDefaultAccount(accountId);
      setAccounts(prev => prev.map(acc => ({ ...acc, is_default: acc.id === accountId })));
      
      toast.success({
        title: "Default Account Set",
        description: "Connected account set as default for payouts"
      });
    } catch (error: any) {
      console.error('Failed to set default account:', error);
      toast.error({
        title: "Error",
        description: "Failed to set default account"
      });
    }
  };

  const getCurrencyFlag = (currency: string) => {
    const currencyMap: Record<string, string> = {
      'ZAR': '🇿🇦',
      'GBP': '🇬🇧',
      'USD': '🇺🇸',
      'EUR': '🇪🇺'
    };
    return currencyMap[currency] || '🌍';
  };

  const getStatusIcon = (account: ConnectedAccount) => {
    if (account.payouts_enabled && account.charges_enabled) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (account.details_submitted) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Connected Accounts</h1>
            <p className="text-muted-foreground mt-2">
              Manage your business accounts and bank connections for payouts
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Connect Account
          </button>
        </div>

        {/* Priority Currencies Info */}
        <div className="bg-muted/30 border border-border rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Priority Currencies
          </h3>
          <div className="flex flex-wrap gap-4">
            {currencies.filter(c => c.priority <= 2).map(currency => (
              <div key={currency.code} className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border">
                <span className="text-xl">{getCurrencyFlag(currency.code)}</span>
                <span className="font-medium">{currency.code}</span>
                <span className="text-sm text-muted-foreground">{currency.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Accounts List */}
        <div className="space-y-6">
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Connected Accounts</h3>
              <p className="text-muted-foreground mb-6">
                Connect your business account to start processing payouts
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Connect Your First Account
              </button>
            </div>
          ) : (
            accounts.map(account => (
              <div key={account.id} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(account)}
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        {account.type === 'express' ? (
                          <>
                            <Building2 className="w-5 h-5" />
                            Express Account
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            Standard Account
                          </>
                        )}
                        {account.is_default && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">Default</span>
                        )}
                      </h3>
                      <p className="text-muted-foreground">
                        {account.business_name || account.email || 'No name set'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getCurrencyFlag(account.country)} {account.country.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!account.is_default && (
                      <button
                        onClick={() => handleSetDefault(account.id)}
                        className="text-sm bg-muted hover:bg-muted/80 px-3 py-1 rounded transition-colors"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedAccount(account.id);
                        setShowBankModal(true);
                      }}
                      className="text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded transition-colors"
                    >
                      Add Bank
                    </button>
                  </div>
                </div>

                {/* Account Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Charges</div>
                    <div className={`font-semibold ${account.charges_enabled ? 'text-green-500' : 'text-red-500'}`}>
                      {account.charges_enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Payouts</div>
                    <div className={`font-semibold ${account.payouts_enabled ? 'text-green-500' : 'text-red-500'}`}>
                      {account.payouts_enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Details</div>
                    <div className={`font-semibold ${account.details_submitted ? 'text-green-500' : 'text-yellow-500'}`}>
                      {account.details_submitted ? 'Complete' : 'Pending'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Type</div>
                    <div className="font-semibold capitalize">{account.type}</div>
                  </div>
                </div>

                {/* External Accounts */}
                <div>
                  <h4 className="font-semibold mb-3">Bank Accounts</h4>
                  {externalAccounts[account.id]?.length > 0 ? (
                    <div className="space-y-2">
                      {externalAccounts[account.id].map(bank => (
                        <div key={bank.id} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4" />
                            <div>
                              <div className="font-medium">
                                {bank.bank_name} ••••{bank.last4}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {getCurrencyFlag(bank.currency)} {bank.currency} • {bank.country}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              bank.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {bank.status}
                            </span>
                            {bank.default_for_currency && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No bank accounts connected
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Account Modal */}
        {showCreateModal && (
          <CreateAccountModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateExpressAccount}
            currencies={currencies}
          />
        )}

        {/* Add Bank Account Modal */}
        {showBankModal && selectedAccount && (
          <AddBankAccountModal
            accountId={selectedAccount}
            onClose={() => {
              setShowBankModal(false);
              setSelectedAccount(null);
            }}
            onSubmit={handleAddBankAccount}
            currencies={currencies}
          />
        )}
      </div>
    </div>
  );
};

// Create Account Modal Component
const CreateAccountModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
  currencies: Currency[];
}> = ({ onClose, onSubmit, currencies }) => {
  const [formData, setFormData] = useState({
    type: 'express',
    country: 'ZA',
    email: '',
    business_type: 'individual',
    business_name: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">Create Express Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Country</label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full p-2 border border-border rounded-lg bg-background"
              required
            >
              <option value="ZA">🇿🇦 South Africa</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="US">🇺🇸 United States</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border border-border rounded-lg bg-background"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Business Type</label>
            <select
              value={formData.business_type}
              onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
              className="w-full p-2 border border-border rounded-lg bg-background"
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Business Name</label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full p-2 border border-border rounded-lg bg-background"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Bank Account Modal Component
const AddBankAccountModal: React.FC<{
  accountId: string;
  onClose: () => void;
  onSubmit: (accountId: string, data: BankAccountCreate) => void;
  currencies: Currency[];
}> = ({ accountId, onClose, onSubmit, currencies }) => {
  const [formData, setFormData] = useState<BankAccountCreate>({
    account_number: '',
    routing_number: '',
    iban: '',
    bic: '',
    currency: 'ZAR',
    country: 'ZA',
    account_holder_name: '',
    account_holder_type: 'individual'
  });

  const [useIban, setUseIban] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(accountId, formData);
  };

  const priorityCurrencies = currencies.filter(c => c.priority <= 2);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Add Bank Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Account Type</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!useIban}
                  onChange={() => setUseIban(false)}
                  className="mr-2"
                />
                Account Number
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={useIban}
                  onChange={() => setUseIban(true)}
                  className="mr-2"
                />
                IBAN
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full p-2 border border-border rounded-lg bg-background"
              required
            >
              {priorityCurrencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Country</label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full p-2 border border-border rounded-lg bg-background"
              required
            >
              <option value="ZA">🇿🇦 South Africa</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="US">🇺🇸 United States</option>
            </select>
          </div>

          {useIban ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">IBAN</label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  className="w-full p-2 border border-border rounded-lg bg-background"
                  placeholder="GB82WEST12345698765432"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">BIC/SWIFT (Optional)</label>
                <input
                  type="text"
                  value={formData.bic}
                  onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                  className="w-full p-2 border border-border rounded-lg bg-background"
                  placeholder="DEUTGB2L"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full p-2 border border-border rounded-lg bg-background"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Routing Number (Optional)</label>
                <input
                  type="text"
                  value={formData.routing_number}
                  onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                  className="w-full p-2 border border-border rounded-lg bg-background"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Account Holder Name</label>
            <input
              type="text"
              value={formData.account_holder_name}
              onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
              className="w-full p-2 border border-border rounded-lg bg-background"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Account Holder Type</label>
            <select
              value={formData.account_holder_type}
              onChange={(e) => setFormData({ ...formData, account_holder_type: e.target.value as 'individual' | 'company' })}
              className="w-full p-2 border border-border rounded-lg bg-background"
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Bank Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectedAccounts;
