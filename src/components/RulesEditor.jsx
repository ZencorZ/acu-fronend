import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RulesEditor.css';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

function RulesEditor({ onClose, adminToken }) {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRule, setEditingRule] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', icon: '📌', section: 1, number: 1 });
    const [message, setMessage] = useState({ text: '', type: '' });

    const getAuthHeaders = () => ({ headers: { 'Authorization': adminToken } });

    useEffect(() => { fetchRules(); }, []);

    const fetchRules = async () => {
        try {
            const response = await api.get('/admin/rules', getAuthHeaders());
            setRules(response.data.sort((a, b) => a.order - b.order));
        } catch (error) { showMessage('Ошибка загрузки правил', 'error'); }
        finally { setLoading(false); }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormData({ title: rule.title, description: rule.description, icon: rule.icon, section: rule.section, number: rule.number });
    };

    const handleUpdate = async () => {
        try {
            await api.put(`/admin/rules/${editingRule.id}`, formData, getAuthHeaders());
            showMessage('Правило обновлено', 'success');
            setEditingRule(null);
            fetchRules();
        } catch (error) { showMessage('Ошибка обновления', 'error'); }
    };

    const handleAdd = async () => {
        if (!formData.title || !formData.description) {
            showMessage('Заполните название и описание', 'error');
            return;
        }
        try {
            await api.post('/admin/rules', formData, getAuthHeaders());
            showMessage('Правило добавлено', 'success');
            setIsAdding(false);
            setFormData({ title: '', description: '', icon: '📌', section: 1, number: 1 });
            fetchRules();
        } catch (error) { showMessage('Ошибка добавления', 'error'); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Удалить это правило?')) {
            try {
                await api.delete(`/admin/rules/${id}`, getAuthHeaders());
                showMessage('Правило удалено', 'success');
                fetchRules();
            } catch (error) { showMessage('Ошибка удаления', 'error'); }
        }
    };

    const groupedRules = rules.reduce((acc, rule) => {
        if (!acc[rule.section]) acc[rule.section] = [];
        acc[rule.section].push(rule);
        return acc;
    }, {});

    const sectionTitles = { 1: "Основные правила", 2: "Правила общения", 3: "Игровые правила" };

    if (loading) return <div className="rules-editor-loading">Загрузка...</div>;

    return (
        <div className="rules-editor-modal">
            <div className="rules-editor-content">
                <div className="rules-editor-header"><h2>📝 Редактор правил</h2><button className="close-btn" onClick={onClose}>✕</button></div>
                {message.text && <div className={`rules-message ${message.type}`}>{message.text}</div>}
                <div className="rules-editor-toolbar"><button className="add-rule-btn" onClick={() => setIsAdding(true)}>➕ Добавить правило</button></div>
                <div className="rules-editor-list">
                    {Object.entries(groupedRules).map(([sectionNum, sectionRules]) => (
                        <div key={sectionNum} className="editor-section">
                            <h3 className="editor-section-title">{sectionTitles[sectionNum] || `Раздел ${sectionNum}`}</h3>
                            {sectionRules.map((rule) => (
                                <div key={rule.id} className="editor-rule-card">
                                    {editingRule?.id === rule.id ? (
                                        <div className="editor-form">
                                            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Название" className="editor-input" />
                                            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Описание" className="editor-textarea" rows="3" />
                                            <div className="editor-row">
                                                <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="Иконка" className="editor-input-small" maxLength="2" />
                                                <select value={formData.section} onChange={(e) => setFormData({ ...formData, section: parseInt(e.target.value) })} className="editor-select">
                                                    <option value={1}>Раздел 1: Основные правила</option>
                                                    <option value={2}>Раздел 2: Правила общения</option>
                                                    <option value={3}>Раздел 3: Игровые правила</option>
                                                </select>
                                            </div>
                                            <div className="editor-actions"><button onClick={handleUpdate} className="save-btn">💾 Сохранить</button><button onClick={() => setEditingRule(null)} className="cancel-btn">❌ Отмена</button></div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="editor-rule-header"><div className="editor-rule-title"><span className="rule-icon">{rule.icon}</span><strong>{rule.section}.{rule.number} {rule.title}</strong></div><div className="editor-rule-buttons"><button onClick={() => handleEdit(rule)} className="edit-rule-btn">✏️</button><button onClick={() => handleDelete(rule.id)} className="delete-rule-btn">🗑️</button></div></div>
                                            <div className="editor-rule-description">{rule.description}</div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                {isAdding && (
                    <div className="editor-add-form">
                        <h3>➕ Новое правило</h3>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Название" className="editor-input" />
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Описание" className="editor-textarea" rows="3" />
                        <div className="editor-row">
                            <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="Иконка" className="editor-input-small" maxLength="2" />
                            <select value={formData.section} onChange={(e) => setFormData({ ...formData, section: parseInt(e.target.value) })} className="editor-select">
                                <option value={1}>Раздел 1: Основные правила</option>
                                <option value={2}>Раздел 2: Правила общения</option>
                                <option value={3}>Раздел 3: Игровые правила</option>
                            </select>
                        </div>
                        <div className="editor-actions"><button onClick={handleAdd} className="save-btn">✅ Добавить</button><button onClick={() => setIsAdding(false)} className="cancel-btn">❌ Отмена</button></div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RulesEditor;