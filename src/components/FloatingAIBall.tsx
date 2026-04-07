import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input, Tag, Avatar, Badge, Tooltip } from 'antd';
import {
  RobotOutlined, SendOutlined, CloseOutlined,
  BulbOutlined, MinusOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { ALL_COURSES, STUDENTS } from '@/data';
import { GRADE_COLOR, GRADE_LABEL } from '@/types';
import {
  computeCourseTotal, computeClassAvg, computeMaxTotal,
  computeDimClassAvg, findClassWeakestDim, findClassStrongestDim,
} from '@/utils/algorithms';

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

const FloatingAIBall: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: '您好！我是 DermaSkin AI 助教。可以随时向我提问关于学员训练、评估分析或教学建议的问题。',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const { settings } = useSettingsStore();
  const { analyses } = useAnalysisStore();
  const hasApiKey = !!settings.ai.apiKey;

  const pageContext = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path === '') return { page: '评估中心', hint: '班级概览与学员评估数据' };
    if (path.includes('/evidence')) return { page: '循证教学', hint: '教学分析与评估模型' };
    if (path.includes('/video')) return { page: '视频工作台', hint: '视频分析与AI评估' };
    if (path.includes('/students')) return { page: '学员管理', hint: '学员档案与详情' };
    if (path.includes('/ai')) return { page: 'AI助手', hint: '智能教学辅助' };
    if (path.includes('/reports')) return { page: '报告中心', hint: '报告生成与导出' };
    return { page: '系统', hint: '通用' };
  }, [location.pathname]);

  const quickPrompts = useMemo(() => {
    const base = ['当前班级整体情况如何？', '哪些学员需要重点关注？'];
    switch (pageContext.page) {
      case '评估中心': return [...base, '各维度成绩分布分析', '班级薄弱环节改进建议'];
      case '循证教学': return [...base, 'EPA达成率分析', '教学方法优化建议'];
      case '视频工作台': return ['如何提升分析准确度？', '视频分析注意事项', '分析结果如何解读？', '常见操作问题分析'];
      case '学员管理': return [...base, '学员分层建议', '个别辅导计划'];
      case '报告中心': return ['报告数据解读', '班级整体评价', '教学改进方案', '学员成长轨迹'];
      default: return [...base, 'EPA达成率分析', '教学改进建议'];
    }
  }, [pageContext.page]);

  useEffect(() => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [msgs, typing]);

  const callQwenAI = useCallback(async (userQuestion: string, context: string): Promise<string> => {
    if (!settings.ai.apiKey) return '';

    try {
      const resp = await fetch(`${settings.ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.ai.apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-turbo-latest',
          messages: [
            {
              role: 'system',
              content: `你是 DermaSkin AI 系统的智能教学助手，专注于皮肤科住院医师操作技能培训分析。
当前用户正在查看「${pageContext.page}」页面（${pageContext.hint}）。

以下是当前系统数据摘要：
${context}

请根据用户问题提供专业、简洁、有针对性的分析和建议。回复使用中文，控制在200字以内。如果涉及具体数据，请引用数据支撑。`,
            },
            { role: 'user', content: userQuestion },
          ],
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      return data.choices?.[0]?.message?.content ?? '抱歉，暂时无法获取AI回复。';
    } catch (err) {
      console.error('[AI Ball] API call failed:', err);
      return '';
    }
  }, [settings.ai.apiKey, settings.ai.baseUrl, pageContext]);

  const buildDataContext = useCallback((): string => {
    const sids = STUDENTS.map(s => s.id);
    const courseStats = ALL_COURSES.map(c => {
      const avg = computeClassAvg(c, sids);
      const maxTotal = computeMaxTotal(c);
      return `${c.shortName}: 均分${avg}/${maxTotal}`;
    });

    const weakStudents = STUDENTS.filter(s => {
      const avgPct = ALL_COURSES.reduce((sum, c) => {
        const t = computeCourseTotal(s.id, c);
        const m = computeMaxTotal(c);
        return sum + (m > 0 ? t / m : 0);
      }, 0) / ALL_COURSES.length;
      return avgPct < 0.7;
    }).map(s => s.name);

    const analysisInfo = analyses.length > 0
      ? `已完成${analyses.length}次AI视频分析。`
      : '尚未进行AI视频分析。';

    return [
      `班级共${STUDENTS.length}人，${ALL_COURSES.length}门课程。`,
      `课程成绩：${courseStats.join('；')}。`,
      weakStudents.length > 0 ? `需关注学员：${weakStudents.join('、')}。` : '暂无明显薄弱学员。',
      analysisInfo,
      `当前页面：${pageContext.page}。`,
    ].join('\n');
  }, [analyses, pageContext]);

  const genReply = useCallback((q: string): string => {
    if (ALL_COURSES.length === 0 || STUDENTS.length === 0) {
      return '当前暂无课程或学员数据，请先导入数据后再进行分析。';
    }

    const sids = STUDENTS.map(s => s.id);
    const courseStats = ALL_COURSES.map(c => {
      const avg = computeClassAvg(c, sids);
      const maxTotal = computeMaxTotal(c);
      const strongest = findClassStrongestDim(c);
      const weakest = findClassWeakestDim(c);
      return { course: c, avg, maxTotal, strongest, weakest };
    });

    const globalAvg = Math.round(courseStats.reduce((s, cs) => s + cs.avg, 0) / courseStats.length);

    const allWeak = new Map<string, { name: string; count: number; minScore: number }>();
    for (const cs of courseStats) {
      for (const s of STUDENTS) {
        const total = computeCourseTotal(s.id, cs.course);
        if (total < 70) {
          const prev = allWeak.get(s.name);
          allWeak.set(s.name, {
            name: s.name,
            count: (prev?.count ?? 0) + 1,
            minScore: Math.min(prev?.minScore ?? 100, total),
          });
        }
      }
    }

    const avgPerStudent = STUDENTS.map(s => {
      const totalAcross = courseStats.reduce((sum, cs) => sum + computeCourseTotal(s.id, cs.course), 0);
      return { ...s, avgAll: Math.round(totalAcross / courseStats.length) };
    });
    const topStudents = [...avgPerStudent].sort((a, b) => b.avgAll - a.avgAll);

    if (q.includes('班级') || q.includes('整体') || q.includes('情况')) {
      const courseLines = courseStats
        .map(cs => `  • ${cs.course.shortName}：均分 ${cs.avg}（${GRADE_LABEL(cs.avg)}）`)
        .join('\n');
      return `当前班级共 ${STUDENTS.length} 名学员，${ALL_COURSES.length} 门课程。\n\n📊 全课程综合均分: ${globalAvg} 分（${GRADE_LABEL(globalAvg)}）\n\n各课程情况：\n${courseLines}\n\n👤 综合排名前三: ${topStudents.slice(0, 3).map(s => `${s.name}(${s.avgAll}分)`).join('、')}\n⚠️ 需关注: ${allWeak.size > 0 ? [...allWeak.values()].map(w => `${w.name}(${w.count}门不达标)`).join('、') : '暂无'}\n\n整体训练参与度良好，建议针对薄弱课程和维度进行专项强化。`;
    }

    if (q.includes('关注') || q.includes('薄弱') || q.includes('风险')) {
      if (allWeak.size === 0) return '当前所有学员在各课程成绩均在合格线以上，暂无需要特别关注的学员。建议持续关注边缘学员的成绩波动。';
      const weakLines = [...allWeak.values()]
        .sort((a, b) => b.count - a.count || a.minScore - b.minScore)
        .map(w => `• ${w.name}（${w.count}门课程不达标，最低 ${w.minScore} 分）— 建议增加个别辅导和模拟训练`)
        .join('\n');
      return `🔍 以下学员需要重点关注（跨课程分析）：\n\n${weakLines}\n\n📋 建议措施：安排一对一指导、增加模拟练习次数、制定个性化学习计划。`;
    }

    if (q.includes('EPA') || q.includes('达成')) {
      const dimStats = courseStats.flatMap(cs =>
        cs.course.rubric.map((dim, di) => ({
          course: cs.course.shortName,
          dim: dim.label,
          avgPct: Math.round(computeDimClassAvg(di, cs.course)),
        }))
      );
      const sorted = [...dimStats].sort((a, b) => a.avgPct - b.avgPct);
      const weakDims = sorted.slice(0, 3);
      const strongDims = sorted.slice(-3).reverse();

      return `📈 EPA / 维度达成率分析（全课程综合）：\n\n🏆 优势维度：\n${strongDims.map(d => `  • ${d.course} - ${d.dim}: ${d.avgPct}%`).join('\n')}\n\n⚠️ 薄弱维度：\n${weakDims.map(d => `  • ${d.course} - ${d.dim}: ${d.avgPct}%`).join('\n')}\n\n💡 建议重点提升上述薄弱维度，可通过标准化病人(SP)训练和角色扮演进行强化。`;
    }

    if (q.includes('建议') || q.includes('教学') || q.includes('改进')) {
      const weakDimList = courseStats
        .map(cs => `${cs.course.shortName} 的「${cs.weakest.label}」(${cs.weakest.avgPct}%)`)
        .join('、');
      return `📚 循证教学建议（基于 ${ALL_COURSES.length} 门课程数据）：\n\n1. **分层教学**: 根据学员水平分为基础组/提升组\n2. **视频回看**: 鼓励学员回看自己的操作视频进行自我反思\n3. **同伴互评**: 组织学员之间互相观摩和点评\n4. **标准示范**: 录制教师标准操作视频供参考\n5. **即时反馈**: 利用AI实时分析提供操作中的即时反馈\n\n📍 各课程薄弱环节: ${weakDimList}\n\n建议每2周进行一次形成性评估，跟踪改进效果。`;
    }

    return `感谢您的提问！基于当前 ${ALL_COURSES.length} 门课程数据：\n\n班级 ${STUDENTS.length} 名学员的综合均分为 ${globalAvg} 分，整体表现${GRADE_LABEL(globalAvg)}。\n\n如需更详细的分析，可以尝试询问：\n• 班级整体情况\n• 需要关注的学员\n• EPA达成率分析\n• 教学改进建议`;
  }, []);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;

    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMsgs(prev => [...prev, { role: 'user', text: q, time: now }]);
    setInput('');
    setTyping(true);

    let reply = '';

    if (hasApiKey) {
      const ctx = buildDataContext();
      reply = await callQwenAI(q, ctx);
    }

    if (!reply) {
      reply = genReply(q);
    }

    setTyping(false);
    const replyTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMsgs(prev => [...prev, { role: 'assistant', text: reply, time: replyTime }]);
  }, [hasApiKey, buildDataContext, callQwenAI, genReply]);

  return (
    <>
      {/* Floating Ball */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setOpen(true)}
            style={{
              position: 'fixed',
              bottom: 28,
              right: 28,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4361EE, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(67,97,238,0.4), 0 0 0 4px rgba(67,97,238,0.1)',
              zIndex: 9999,
            }}
            whileHover={{ scale: 1.1, boxShadow: '0 6px 28px rgba(67,97,238,0.5)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Badge dot status="success" offset={[-4, 4]}>
              <RobotOutlined style={{ fontSize: 26, color: '#fff' }} />
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 380,
              height: 520,
              borderRadius: 20,
              background: '#fff',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 9999,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #4361EE, #7C3AED)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar
                  size={36}
                  icon={<RobotOutlined />}
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
                />
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    AI 助教
                    <Tag style={{ fontSize: 9, background: hasApiKey ? '#05CD9918' : '#F59E0B18', color: hasApiKey ? '#05CD99' : '#F59E0B', border: 'none', fontWeight: 600 }}>
                      {hasApiKey ? 'AI 模式' : '离线模式'}
                    </Tag>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>
                    DermaSkin · 在线
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Tooltip title="最小化">
                  <div
                    onClick={() => setOpen(false)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff', fontSize: 12,
                    }}
                  >
                    <MinusOutlined />
                  </div>
                </Tooltip>
                <Tooltip title="关闭">
                  <div
                    onClick={() => setOpen(false)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff', fontSize: 12,
                    }}
                  >
                    <CloseOutlined />
                  </div>
                </Tooltip>
              </div>
            </div>

            {/* Page context */}
            <div style={{ padding: '4px 16px', background: '#F4F7FE', fontSize: 11, color: '#707EAE', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>📍</span> 当前：{pageContext.page}
              {hasApiKey && <Tag style={{ fontSize: 9, background: '#4361EE12', color: '#4361EE', border: 'none', marginLeft: 'auto' }}>通义千问</Tag>}
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 14px',
                background: '#F8FAFF',
              }}
            >
              {msgs.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '10px 14px',
                      borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background:
                        m.role === 'user'
                          ? 'linear-gradient(135deg, #4361EE, #5B73F0)'
                          : '#fff',
                      color: m.role === 'user' ? '#fff' : '#2B3674',
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      boxShadow:
                        m.role === 'assistant'
                          ? '0 1px 4px rgba(0,0,0,0.06)'
                          : 'none',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {m.text}
                    <div
                      style={{
                        fontSize: 9,
                        marginTop: 4,
                        opacity: 0.5,
                        textAlign: m.role === 'user' ? 'right' : 'left',
                      }}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              ))}
              {typing && (
                <div style={{ display: 'flex', gap: 6, padding: '8px 14px' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                      style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#A3AED0',
                      }}
                    />
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick prompts */}
            <div
              style={{
                padding: '6px 12px',
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                borderTop: '1px solid #F1F4F9',
                background: '#fff',
              }}
            >
              {quickPrompts.map((q) => (
                <Tag
                  key={q}
                  onClick={() => send(q)}
                  style={{
                    cursor: 'pointer',
                    fontSize: 10,
                    borderRadius: 10,
                    padding: '2px 8px',
                    border: '1px solid #E0E6F5',
                    color: '#4361EE',
                    background: '#4361EE08',
                    transition: 'all 0.2s',
                  }}
                >
                  <BulbOutlined style={{ marginRight: 3 }} />
                  {q}
                </Tag>
              ))}
            </div>

            {/* Input */}
            <div
              style={{
                padding: '10px 12px',
                borderTop: '1px solid #F1F4F9',
                display: 'flex',
                gap: 8,
                background: '#fff',
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={() => send(input)}
                placeholder="输入问题..."
                style={{ borderRadius: 10, fontSize: 12 }}
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => send(input)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: input.trim()
                    ? 'linear-gradient(135deg, #4361EE, #7C3AED)'
                    : '#E9EDF7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                }}
              >
                <SendOutlined
                  style={{
                    color: input.trim() ? '#fff' : '#A3AED0',
                    fontSize: 14,
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingAIBall;
