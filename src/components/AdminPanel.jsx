import React, { useState, useEffect } from 'react';
import './AdminPanel.css';
import axios from 'axios';
import RulesEditor from './RulesEditor';
import BuildEditor from './BuildEditor';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

function AdminPanel({ onClose, isLoggedIn, onLogin, onLogout }) {
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [settings, setSettings] = useState({
        autoApproveEnabled: false,
        whitelistSyncEnabled: false,
        autoFetchUUID: true,
        autoApproveRules: { minUsernameLength: 3, requireReason: false, requireUUID: false }
    });
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('applications');
    const [showRulesEditor, setShowRulesEditor] = useState(false);
    const [showBuildEditor, setShowBuildEditor] = useState(false);

    const getAuthHeaders = () => ({ headers: { 'Authorization': localStorage.getItem('adminToken') } });

    useEffect(() => {
        if (isLoggedIn) {
            fetchApplications();
            fetchSettings();
        }
    }, [isLoggedIn]);

    const fetchApplications = async () => {
        try {
            const response = await api.get('/admin/whitelist', getAuthHeaders());
            setApplications(response.data);
            calculateStats(response.data);
        } catch (error) {
            console.error('Ошибка загрузки заявок:', error);
            if (error.response?.status === 401) { localStorage.removeItem('adminToken'); onLogout?.(); }
        } finally { setLoading(false); }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get('/admin/settings', getAuthHeaders());
            setSettings(response.data);
        } catch (error) { console.error('Ошибка загрузки настроек:', error); }
    };

    const calculateStats = (apps) => {
        setStats({
            pending: apps.filter(a => a.status === 'pending').length,
            approved: apps.filter(a => a.status === 'approved').length,
            rejected: apps.filter(a => a.status === 'rejected').length
        });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            const response = await api.post('/admin/login', loginData);
            if (response.data.success) {
                localStorage.setItem('adminToken', response.data.token);
                onLogin?.();
            }
        } catch (error) {
            setLoginError(error.response?.data?.error || 'Ошибка входа');
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/admin/whitelist/${id}`, { status }, getAuthHeaders());
            fetchApplications();
            showTemporaryMessage('Статус обновлён', 'success');
        } catch (error) { showTemporaryMessage('Ошибка обновления', 'error'); }
    };

    const deleteApplication = async (id) => {
        if (window.confirm('Удалить эту заявку?')) {
            try {
                await api.delete(`/admin/whitelist/${id}`, getAuthHeaders());
                fetchApplications();
                showTemporaryMessage('Заявка удалена', 'success');
            } catch (error) { showTemporaryMessage('Ошибка удаления', 'error'); }
        }
    };

    const updateSettings = async (newSettings) => {
        setSettingsLoading(true);
        try {
            const response = await api.post('/admin/settings', newSettings, getAuthHeaders());
            if (response.data.success) {
                setSettings(response.data.settings);
                showTemporaryMessage('Настройки сохранены', 'success');
            }
        } catch (error) { showTemporaryMessage('Ошибка сохранения', 'error'); }
        finally { setSettingsLoading(false); }
    };

    const showTemporaryMessage = (message, type) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `settings-toast ${type}`;
        msgDiv.textContent = message;
        msgDiv.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;z-index:10000;background:' + (type === 'success' ? 'rgba(0,255,0,0.9)' : 'rgba(255,0,0,0.9)') + ';color:white;font-weight:bold';
        document.body.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 3000);
    };

    const handleAutoApproveToggle = () => updateSettings({ autoApproveEnabled: !settings.autoApproveEnabled });
    const handleWhitelistSyncToggle = () => updateSettings({ whitelistSyncEnabled: !settings.whitelistSyncEnabled });
    const handleAutoFetchUUIDToggle = () => updateSettings({ autoFetchUUID: !settings.autoFetchUUID });
    const handleRuleChange = (rule, value) => updateSettings({ autoApproveRules: { ...settings.autoApproveRules, [rule]: value } });

    const handleLogoutClick = async () => {
        try {
            await api.post('/admin/logout', {}, getAuthHeaders());
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
        localStorage.removeItem('adminToken');
        onLogout?.();
    };

    const filteredApplications = applications.filter(app => filter === 'all' ? true : app.status === filter);
    const getStatusBadgeClass = (status) => ({ pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' }[status] || '');
    const getStatusText = (status) => ({ pending: '⏳ На рассмотрении', approved: '✅ Одобрено', rejected: '❌ Отклонено' }[status] || status);

    if (!isLoggedIn) {
        return (
            <div className="admin-modal">
                <div className="admin-modal-content">
                    <div className="admin-modal-header"><h2>🔐 Панель управления</h2><button className="close-btn" onClick={onClose}>✕</button></div>
                    <form onSubmit={handleLogin} className="admin-login-form">
                        <div className="form-group"><label>Логин</label><input type="text" value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} placeholder="Введите логин" required autoComplete="off" /></div>
                        <div className="form-group"><label>Пароль</label><input type="password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} placeholder="Введите пароль" required autoComplete="off" /></div>
                        {loginError && <div className="login-error">{loginError}</div>}
                        <button type="submit" className="login-submit">Войти</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-modal admin-panel">
            <div className="admin-modal-content admin-panel-content">
                <div className="admin-modal-header"><h2>⚙️ Панель управления</h2><button className="close-btn" onClick={onClose}>✕</button></div>

                <div className="admin-tabs">
                    <button className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>📋 Заявки ({applications.length})</button>
                    <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ Настройки</button>
                </div>

                {activeTab === 'applications' ? (
                    <>
                        <div className="admin-stats">
                            <div className="stat-card"><span className="stat-value">{stats.pending}</span><span className="stat-label">На рассмотрении</span></div>
                            <div className="stat-card"><span className="stat-value">{stats.approved}</span><span className="stat-label">Одобрено</span></div>
                            <div className="stat-card"><span className="stat-value">{stats.rejected}</span><span className="stat-label">Отклонено</span></div>
                            <div className="stat-card"><span className="stat-value">{applications.length}</span><span className="stat-label">Всего заявок</span></div>
                        </div>
                        <div className="admin-filters">
                            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Все ({applications.length})</button>
                            <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Ожидают ({stats.pending})</button>
                            <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>Одобрены ({stats.approved})</button>
                            <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>Отклонены ({stats.rejected})</button>
                        </div>
                        <div className="applications-list">
                            {loading ? <div className="loading-spinner">Загрузка...</div> : filteredApplications.length === 0 ? <div className="no-applications">Нет заявок</div> :
                                filteredApplications.map(app => (
                                    <div key={app.id} className={`application-card status-${app.status}`}>
                                        <div className="app-header">
                                            <div className="app-user">
                                                <span className="app-username">🎮 {app.username}</span>
                                                {app.autoApproved && <span className="auto-badge">🤖 Авто</span>}
                                            </div>
                                            <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>{getStatusText(app.status)}</span>
                                        </div>

                                        <div className="app-additional">
                                            {app.discordTag && (
                                                <div className="app-field">
                                                    <span className="field-label">💬 Discord:</span>
                                                    <span className="field-value">{app.discordTag}</span>
                                                </div>
                                            )}
                                            {app.createExperience && (
                                                <div className="app-field">
                                                    <span className="field-label">⚙️ Опыт Create:</span>
                                                    <span className="field-value">{app.createExperience}</span>
                                                </div>
                                            )}
                                        </div>

                                        {app.reason && (
                                            <div className="app-reason">
                                                <strong>📝 Причина:</strong>
                                                <p>{app.reason}</p>
                                            </div>
                                        )}

                                        <div className="app-meta">
                                            <span>📅 {new Date(app.createdAt).toLocaleString()}</span>
                                            {app.updatedAt && <span>🔄 {new Date(app.updatedAt).toLocaleString()}</span>}
                                        </div>

                                        <div className="app-actions">
                                            {app.status === 'pending' && (
                                                <>
                                                    <button onClick={() => updateStatus(app.id, 'approved')} className="action-approve">✅ Одобрить</button>
                                                    <button onClick={() => updateStatus(app.id, 'rejected')} className="action-reject">❌ Отклонить</button>
                                                </>
                                            )}
                                            <button onClick={() => deleteApplication(app.id)} className="action-delete">🗑️ Удалить</button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </>
                ) : (
                    <div className="settings-panel">
                        <div className="settings-section">
                            <h3>🤖 Автоматическое одобрение</h3>
                            <div className="setting-card">
                                <div className="setting-item toggle-setting">
                                    <div className="setting-info">
                                        <span className="setting-title">Включить авто-одобрение</span>
                                        <span className="setting-description">Все новые заявки будут одобряться автоматически</span>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={settings.autoApproveEnabled} onChange={handleAutoApproveToggle} disabled={settingsLoading} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                {settings.autoApproveEnabled && (
                                    <div className="auto-approve-status">
                                        <div className="status-badge-active">✅ Режим автоматического одобрения АКТИВЕН</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="settings-section">
                            <h3>🔄 Whitelist Sync</h3>
                            <div className="setting-card">
                                <div className="setting-item toggle-setting">
                                    <div className="setting-info">
                                        <span className="setting-title">Включить Whitelist Sync</span>
                                        <span className="setting-description">Синхронизация с Whitelist Sync Web</span>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={settings.whitelistSyncEnabled || false} onChange={handleWhitelistSyncToggle} disabled={settingsLoading} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                {settings.whitelistSyncEnabled && (
                                    <div className="wsync-info">
                                        <p>✅ При одобрении заявки игрок добавляется в Whitelist Sync</p>
                                        <p>⚠️ API-ключ должен быть настроен на сервере</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="settings-section">
                            <h3>🔧 Дополнительно</h3>
                            <div className="setting-card">
                                <div className="setting-item toggle-setting">
                                    <div className="setting-info">
                                        <span className="setting-title">Авто-получение UUID</span>
                                        <span className="setting-description">Автоматически получать UUID из Mojang API</span>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={settings.autoFetchUUID !== false} onChange={handleAutoFetchUUIDToggle} disabled={settingsLoading} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-info">
                                        <span className="setting-title">Мин. длина никнейма</span>
                                        <span className="setting-description">Минимальное количество символов</span>
                                    </div>
                                    <input type="number" className="setting-input" value={settings.autoApproveRules.minUsernameLength} onChange={(e) => handleRuleChange('minUsernameLength', parseInt(e.target.value) || 3)} min="3" max="16" disabled={settingsLoading} />
                                </div>
                                <div className="setting-item toggle-setting">
                                    <div className="setting-info">
                                        <span className="setting-title">Требовать причину</span>
                                        <span className="setting-description">Пользователь должен указать причину</span>
                                    </div>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={settings.autoApproveRules.requireReason} onChange={(e) => handleRuleChange('requireReason', e.target.checked)} disabled={settingsLoading} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="settings-section">
                            <button onClick={() => setShowRulesEditor(true)} className="edit-rules-main-btn">📝 Редактировать правила</button>
                        </div>

                        <div className="settings-section">
                            <button onClick={() => setShowBuildEditor(true)} className="edit-build-main-btn">📦 Редактировать сборку</button>
                        </div>
                    </div>
                )}

                <div className="admin-footer">
                    <button onClick={fetchApplications} className="refresh-btn">🔄 Обновить</button>
                    <button onClick={handleLogoutClick} className="logout-btn">🚪 Выйти</button>
                </div>
            </div>
            {showRulesEditor && <RulesEditor onClose={() => setShowRulesEditor(false)} adminToken={localStorage.getItem('adminToken')} />}
            {showBuildEditor && <BuildEditor onClose={() => setShowBuildEditor(false)} adminToken={localStorage.getItem('adminToken')} />}
        </div>
    );
}

export default AdminPanel;