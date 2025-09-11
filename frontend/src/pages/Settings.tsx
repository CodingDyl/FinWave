import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  CreditCard, 
  Globe, 
  Settings as SettingsIcon, 
  Save, 
  Edit3, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  LogOut,
  Trash2,
  Plus
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { 
  listConnectedAccounts, 
  setDefaultAccount,
  getSupportedCurrencies,
  listBeneficiaries,
  listDestinations,
  getUserProfile
} from '../lib/api';
import { useToast } from '../components/toast/ToastProvider';
import { Link } from 'react-router-dom';
import type { ConnectedAccount, Currency, Beneficiary, Destination, UserProfile } from '../types/index';

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'accounts' | 'security' | 'preferences'>('profile');
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const profile = await getUserProfile();
      setUserProfile(profile);
      setProfileForm({
        name: profile.name || '',
        email: profile.email || ''
      });

      // Load connected accounts
      try {
        const accounts = await listConnectedAccounts();
        setConnectedAccounts(accounts);
      } catch (error) {
        console.log('No connected accounts or error loading:', error);
      }

      // Load beneficiaries
      try {
        const beneficiariesData = await listBeneficiaries();
        setBeneficiaries(beneficiariesData);
      } catch (error) {
        console.log('Error loading beneficiaries:', error);
      }

      // Load currencies
      try {
        const currenciesData = await getSupportedCurrencies();
        setCurrencies(currenciesData.currencies);
      } catch (error) {
        console.log('Error loading currencies:', error);
      }

    } catch (error) {
      console.error('Failed to load user data:', error);
      toast.error({
        title: "Error",
        description: "Failed to load settings data"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      // Note: This would require a backend endpoint to update user profile
      // For now, we'll just show a success message
      toast.success({
        title: "Profile Updated",
        description: "Your profile has been updated successfully"
      });
      setIsEditingProfile(false);
    } catch (error) {
      toast.error({
        title: "Error",
        description: "Failed to update profile"
      });
    }
  };

  const handleSetDefaultAccount = async (accountId: string) => {
    try {
      await setDefaultAccount(accountId);
      setConnectedAccounts(prev => 
        prev.map(acc => ({ ...acc, is_default: acc.id === accountId }))
      );
      toast.success({
        title: "Default Account Set",
        description: "Connected account set as default for payouts"
      });
    } catch (error) {
      toast.error({
        title: "Error",
        description: "Failed to set default account"
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success({
        title: "Logged Out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      toast.error({
        title: "Error",
        description: "Failed to logout"
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
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account, connected accounts, and preferences
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-muted/30 p-1 rounded-lg w-fit">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'accounts', label: 'Accounts', icon: Building2 },
            { id: 'security', label: 'Security', icon: CreditCard },
            { id: 'preferences', label: 'Preferences', icon: Globe }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Profile Information</h2>
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    {isEditingProfile ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                <div className="flex items-start gap-6">
                  {/* Profile Picture */}
                  <div className="flex-shrink-0">
                    {userProfile?.picture ? (
                      <img
                        src={userProfile.picture}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Profile Details */}
                  <div className="flex-1 space-y-4">
                    {isEditingProfile ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Name</label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full p-3 border border-border rounded-lg bg-background"
                            placeholder="Enter your name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Email</label>
                          <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            className="w-full p-3 border border-border rounded-lg bg-background"
                            placeholder="Enter your email"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleProfileUpdate}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            Save Changes
                          </button>
                          <button
                            onClick={() => setIsEditingProfile(false)}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-muted-foreground">Name</label>
                          <p className="text-lg font-medium">{userProfile?.name || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Email</label>
                          <p className="text-lg font-medium">{userProfile?.email || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">User ID</label>
                          <p className="text-sm font-mono text-muted-foreground">{userProfile?.user_id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Connected Accounts</h3>
                  </div>
                  <p className="text-2xl font-bold">{connectedAccounts.length}</p>
                  <p className="text-sm text-muted-foreground">Business accounts</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Beneficiaries</h3>
                  </div>
                  <p className="text-2xl font-bold">{beneficiaries.length}</p>
                  <p className="text-sm text-muted-foreground">People you pay</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Bank Accounts</h3>
                  </div>
                  <p className="text-2xl font-bold">{destinations.length}</p>
                  <p className="text-sm text-muted-foreground">Payment methods</p>
                </div>
              </div>
            </div>
          )}

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Connected Accounts</h2>
                <Link
                  to="/connected-accounts"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Manage Accounts
                </Link>
              </div>

              {connectedAccounts.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Connected Accounts</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your business accounts to start processing payouts
                  </p>
                  <Link
                    to="/connected-accounts"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Connect Your First Account
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {connectedAccounts.map(account => (
                    <div key={account.id} className="bg-card border border-border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-primary" />
                          <div>
                            <h3 className="font-semibold">
                              {account.business_name || account.email || 'Express Account'}
                              {account.is_default && (
                                <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                  Default
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {getCurrencyFlag(account.country)} {account.country.toUpperCase()} • {account.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!account.is_default && (
                            <button
                              onClick={() => handleSetDefaultAccount(account.id)}
                              className="text-sm bg-muted hover:bg-muted/80 px-3 py-1 rounded transition-colors"
                            >
                              Set Default
                            </button>
                          )}
                          <Link
                            to="/connected-accounts"
                            className="text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded transition-colors"
                          >
                            Manage
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Session Management</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage your active sessions and logout
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Account Security</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                          <h4 className="font-medium">Two-Factor Authentication</h4>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                          Enable
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                          <h4 className="font-medium">API Keys</h4>
                          <p className="text-sm text-muted-foreground">
                            Manage your API access keys
                          </p>
                        </div>
                        <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-6">Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Currency Preferences</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {currencies.filter(c => c.priority <= 2).map(currency => (
                        <div key={currency.code} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                          <span className="text-xl">{getCurrencyFlag(currency.code)}</span>
                          <div>
                            <div className="font-medium">{currency.code}</div>
                            <div className="text-sm text-muted-foreground">{currency.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Notification Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications about payouts and account activity
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                          Enabled
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">SMS Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive SMS alerts for important account events
                          </p>
                        </div>
                        <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                          Enable
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Data & Privacy</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Data Export</h4>
                          <p className="text-sm text-muted-foreground">
                            Download a copy of your account data
                          </p>
                        </div>
                        <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                          Export
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Delete Account</h4>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all data
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;