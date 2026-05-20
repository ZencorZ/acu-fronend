import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RulesPage.css';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

function RulesPage() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { fetchRules(); }, []);

    const fetchRules = async () => {
        try {
            const response = await api.get('/rules');
            setRules(response.data.sort((a, b) => a.order - b.order));
        } catch (error) {
            console.error('Ошибка загрузки правил:', error);
            setError('Не удалось загрузить правила');
        } finally { setLoading(false); }
    };

    const groupedRules = rules.reduce((acc, rule) => {
        if (!acc[rule.section]) acc[rule.section] = [];
        acc[rule.section].push(rule);
        return acc;
    }, {});

    const sectionTitles = { 1: "Основные правила", 2: "Правила общения", 3: "Игровые правила" };

    if (loading) return <div className="rules-page"><div className="loading-container"><div className="loading-spinner-large"></div><p>Загрузка правил...</p></div></div>;
    if (error) return <div className="rules-page"><div className="error-container"><p>⚠️ {error}</p></div></div>;

    return (
        <div className="rules-page">
            <div className="rules-header">
                <div className="rules-header-content">
                    <span className="rules-icon">📜</span>
                    <h1>Правила сервера Association Create Units</h1>
                    <p>Association Create Units — сообщество, построенное на взаимном уважении</p>
                </div>
            </div>
            <div className="rules-stats">
                <div className="stat-card"><span className="stat-number">{rules.length}</span><span className="stat-text">Всего правил</span></div>
                <div className="stat-card"><span className="stat-number">3</span><span className="stat-text">Раздела</span></div>
                <div className="stat-card"><span className="stat-number">⚔️</span><span className="stat-text">Association Create Units</span></div>
            </div>
            <div className="rules-container">
                {Object.entries(groupedRules).map(([sectionNum, sectionRules]) => (
                    <div key={sectionNum} className="rules-section">
                        <h2 className="section-title"><span className="section-number">{sectionNum}</span>{sectionTitles[sectionNum] || `Раздел ${sectionNum}`}</h2>
                        <div className="rules-list">
                            {sectionRules.map((rule) => (
                                <div key={rule.id} className="rule-item">
                                    <div className="rule-number"><span className="rule-section">{rule.section}</span><span className="rule-separator">.</span><span className="rule-num">{rule.number}</span></div>
                                    <div className="rule-icon">{rule.icon}</div>
                                    <div className="rule-content"><h3>{rule.title}</h3><p>{rule.description}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="rules-footer">
                <div className="warning-box"><span className="warning-icon">⚠️</span><div><strong>Нарушение правил влечёт за собой наказание:</strong><ul><li>Предупреждение (Warning) — 1-е нарушение</li><li>Временный бан (Temp Ban) — от 3 до 14 дней</li><li>Постоянный бан (Permanent Ban) — систематические нарушения</li></ul></div></div>
                <div className="appeal-box"><span className="appeal-icon">💬</span><div><strong>Обжалование наказания:</strong><p>Если вы считаете, что вас наказали ошибочно, вы можете подать апелляцию через форму связи с администрацией на сервере или в Discord-сообществе Association Create Units.</p></div></div>
            </div>
        </div>
    );
}

export default RulesPage;