import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Card, Input, Button, Badge, Select, Collapse } from 'antd';
import {
  RobotOutlined,
  SendOutlined,
  UserOutlined,
  BulbOutlined,
  ClearOutlined,
  ColumnWidthOutlined,
  CloseOutlined,
  DownOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_COURSES, STUDENTS } from '@/data';
import { GRADE_LABEL } from '@/types';
import {
  computeCourseTotal,
  computeClassAvg,
  computeMaxTotal,
  findClassWeakestDim,
  findClassStrongestDim,
} from '@/utils/algorithms';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  '请分析当前班级的整体训练情况',
  '哪些学员需要额外关注？',
  '请给出薄弱环节的教学改进建议',
  '如何提升镜下观察维度的教学效果？',
  '请总结本学期的EPA达成情况',
];

const CARD_RADIUS = 14;

const shellStyle: React.CSSProperties = {
  '--primary': '#4361EE',
  '--primary-dark': '#3651D4',
  '--accent': '#7C3AED',
  '--ai-primary': '#4361EE',
  '--ai-primary-dark': '#3651D4',
  '--ai-accent': '#7C3AED',
  '--ai-surface': '#FFFFFF',
  '--ai-surface-muted': '#F4F7FE',
  '--ai-border': 'rgba(67, 97, 238, 0.12)',
  '--ai-text': '#1E293B',
  '--ai-text-muted': '#64748B',
  '--ai-shadow': '0 4px 24px rgba(15, 23, 42, 0.06)',
  '--ai-shadow-sm': '0 2px 12px rgba(15, 23, 42, 0.05)',
} as React.CSSProperties;

function formatTimestamp(d: Date): string {
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (isToday) return `今天 ${time}`;
  return d.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function parseBoldSegments(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/);
    if (m) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: 'inherit' }}>
          {m[1]}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function FormattedMessageBody({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split('\n');
  const muted = isUser ? 'rgba(255,255,255,0.85)' : 'var(--ai-text-muted, #64748B)';
  const textColor = isUser ? '#fff' : 'var(--ai-text, #1E293B)';

  return (
    <div style={{ fontSize: 13, lineHeight: 1.75, color: textColor }}>
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) {
          return <div key={i} style={{ height: 6 }} />;
        }
        const bulletMatch = line.match(/^(\s*)[•\-]\s*(.*)$/);
        const circledNum = /^[①②③④⑤⑥⑦⑧⑨⑩]/.test(t);
        const plainNum = /^\d+[\.、]\s*/.test(t);

        if (bulletMatch) {
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                margin: '0.2em 0',
                paddingLeft: 2,
              }}
            >
              <span style={{ color: isUser ? 'rgba(255,255,255,0.95)' : 'var(--ai-primary, #4361EE)', flexShrink: 0 }}>
                •
              </span>
              <span style={{ flex: 1 }}>{parseBoldSegments(bulletMatch[2])}</span>
            </div>
          );
        }

        if (circledNum || plainNum) {
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                margin: '0.25em 0',
                paddingLeft: 2,
              }}
            >
              <span style={{ color: muted, fontSize: 12, flexShrink: 0, minWidth: 18 }}>◇</span>
              <span style={{ flex: 1 }}>{parseBoldSegments(line.replace(/^\s+/, ''))}</span>
            </div>
          );
        }

        return (
          <p key={i} style={{ margin: '0.35em 0', wordBreak: 'break-word' }}>
            {parseBoldSegments(line)}
          </p>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--ai-primary, #4361EE), var(--ai-accent, #7C3AED))',
            display: 'inline-block',
          }}
          animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.18,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '您好！我是 DermaSkin **AI 教学助手**。\n\n我可以帮您分析学员训练数据、提供教学建议、解答皮肤科操作评估相关问题。\n\n当前系统中有 8 名学员、5 门课程的评估数据。请随时向我提问！',
      timestamp: formatTimestamp(new Date()),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(ALL_COURSES[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const course = useMemo(
    () => ALL_COURSES.find((c) => c.id === selectedCourseId) ?? ALL_COURSES[0],
    [selectedCourseId]
  );

  const studentCtx = useMemo(
    () => (selectedStudent != null ? STUDENTS.find((s) => s.id === selectedStudent) ?? null : null),
    [selectedStudent]
  );

  const courseStats = useMemo(() => {
    const ids = STUDENTS.map((s) => s.id);
    const classAvg = computeClassAvg(course, ids);
    const maxTotal = computeMaxTotal(course);
    const weak = findClassWeakestDim(course);
    const strong = findClassStrongestDim(course);
    const excellent = STUDENTS.filter((s) => computeCourseTotal(s.id, course) >= 90).length;
    const needHelp = STUDENTS.filter((s) => computeCourseTotal(s.id, course) < 70).length;
    return { classAvg, maxTotal, weak, strong, excellent, needHelp };
  }, [course]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateResponse = useCallback(
    (question: string): string => {
      const stu = selectedStudent ? STUDENTS.find((s) => s.id === selectedStudent) : null;

      if (question.includes('班级') || question.includes('整体')) {
        const avg = Math.round(
          STUDENTS.reduce((s, st) => s + computeCourseTotal(st.id, course), 0) / STUDENTS.length
        );
        return `当前班级整体分析报告（**${course.name}**）：\n\n• 班级均分：**${avg}**分（${GRADE_LABEL(avg)}）\n• 学员总数：${STUDENTS.length}人\n• 课程：${course.name}\n\n• 优秀学员（≥90分）：${STUDENTS.filter((s) => computeCourseTotal(s.id, course) >= 90)
          .map((s) => s.name)
          .join('、') || '暂无'}\n• 需关注学员（<70分）：${STUDENTS.filter((s) => computeCourseTotal(s.id, course) < 70)
          .map((s) => s.name)
          .join('、') || '暂无'}\n\n建议重点加强薄弱环节的专项训练，安排一对一辅导。`;
      }

      if (question.includes('关注') || question.includes('薄弱')) {
        const weak = STUDENTS.filter((s) => computeCourseTotal(s.id, course) < 75);
        if (weak.length === 0) {
          return '目前所有学员的课程得分均在合格线以上，整体表现良好。建议继续保持当前教学节奏。';
        }
        return `需要额外关注的学员（**${course.shortName}**）：\n\n${weak
          .map((s) => {
            const total = computeCourseTotal(s.id, course);
            return `• ${s.name}：**${total}**分（${GRADE_LABEL(total)}），专注度${Math.round(s.avgAttention * 100)}%，出勤率${Math.round(s.attendance * 100)}%`;
          })
          .join('\n')}\n\n建议措施：\n① 为上述学员安排额外的操作练习时间\n② 一对一指导薄弱操作环节\n③ 加强课堂互动提升专注度`;
      }

      if (question.includes('镜下') || question.includes('观察')) {
        const dim = course.rubric.find((r) => r.label.includes('镜下') || r.key.includes('micro'));
        const hint = dim ? `当前课程中与镜下相关的维度为「**${dim.label}**」，建议结合录像回放进行示范讲解。` : '建议结合课程录像与评分量表，针对「镜下观察」相关条目做分项复盘。';
        return `关于镜下观察维度的教学提升（**${course.name}**）：\n\n• ${hint}\n• 安排同伴互评与教师即时反馈\n• 将典型错误剪辑为 1–2 分钟微课，课前播放\n\n如需，我可以结合某位学员的得分进一步分析。`;
      }

      if (question.includes('EPA') || question.includes('能力')) {
        return '本学期 EPA 达成情况概览：\n\n• **EPA-1** 无菌操作：多数学员已达 L2-L3 级别\n• **EPA-2** 皮肤取材：60% 学员达到 L2 级别\n• **EPA-3** 真菌镜检：核心技能，平均 L2 级别\n• **EPA-4** 皮肤活检：较高难度，多数学员 L1-L2\n• **EPA-7** 患者沟通：表现较好，70% 达 L3\n\n建议下一阶段重点推进 **EPA-4 皮肤活检**的训练进度。';
      }

      if (stu) {
        const total = computeCourseTotal(stu.id, course);
        return `关于 **${stu.name}** 的分析（${course.name}）：\n\n• 得分：**${total}**分（${GRADE_LABEL(total)}）\n• 专注度：${Math.round(stu.avgAttention * 100)}%\n• 参与度：${Math.round(stu.avgEngagement * 100)}%\n• 知识掌握率：${Math.round(stu.knowledgeMastery * 100)}%\n• 训练时长：${stu.practiceHours} 小时\n\n近期成绩趋势：${stu.recentScores.slice(-4).join(' → ')}\n\n${
          total >= 85
            ? '该学员表现优秀，建议鼓励其协助指导其他同学。'
            : total >= 70
              ? '该学员表现合格，建议针对薄弱环节进行专项提升。'
              : '该学员需要重点关注，建议安排额外辅导。'
        }`;
      }

      return `感谢您的提问！基于当前系统数据（**${course.name}** 等 ${ALL_COURSES.length} 门课程），以下是我的分析：\n\n当前系统包含 **${STUDENTS.length}** 名学员的完整评估数据。\n\n针对您的问题「${question}」，建议：\n① 查看评估中心的分析报告获取详细数据\n② 关注循证教学中心的成效追踪模块\n③ 选择特定学员后再次提问以获取个性化分析\n\n如需更详细的分析，请提供具体的学员姓名或课程名称。`;
    },
    [course, selectedStudent]
  );

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const now = new Date();
    const userMsg: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: formatTimestamp(now),
    };
    const q = inputValue;
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(q);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          timestamp: formatTimestamp(new Date()),
        },
      ]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleQuickPrompt = (p: string) => {
    setInputValue(p);
  };

  const clearChat = () => {
    setMessages((prev) => prev.slice(0, 1));
  };

  return (
    <div style={shellStyle}>
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: CARD_RADIUS,
              background: 'linear-gradient(135deg, var(--ai-primary, #4361EE), var(--ai-accent, #7C3AED))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--ai-shadow-sm)',
            }}
          >
            <RobotOutlined style={{ fontSize: 22, color: '#fff' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-heading, #0F172A)',
                  letterSpacing: '0.02em',
                }}
              >
                AI 教学助手
              </h2>
              <Badge
                status="success"
                text={<span style={{ fontSize: 12, color: 'var(--ai-text-muted, #64748B)' }}>在线</span>}
              />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ai-text-muted, #64748B)' }}>
              皮肤科医学教育 · 智能分析与教学建议
            </p>
          </div>
        </div>
        <Button
          type={sidebarOpen ? 'primary' : 'default'}
          icon={sidebarOpen ? <CloseOutlined /> : <ColumnWidthOutlined />}
          onClick={() => setSidebarOpen((o) => !o)}
          style={
            sidebarOpen
              ? {
                  background: 'linear-gradient(135deg, var(--ai-primary, #4361EE), var(--ai-accent, #7C3AED))',
                  border: 'none',
                }
              : { borderColor: 'var(--ai-border)' }
          }
        >
          {sidebarOpen ? '关闭分析' : '分析上下文'}
        </Button>
      </motion.header>

      <div
        style={{
          display: 'flex',
          gap: 0,
          height: 'calc(100vh - 148px)',
          minHeight: 420,
          position: 'relative',
        }}
      >
        {/* Main chat */}
        <motion.div
          layout
          style={{ flex: 1, minWidth: 0, display: 'flex' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          <Card
            style={{
              flex: 1,
              borderRadius: CARD_RADIUS,
              border: '1px solid var(--ai-border)',
              boxShadow: 'var(--ai-shadow)',
              overflow: 'hidden',
            }}
            styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
          >
            {/* Collapsible context */}
            <div style={{ borderBottom: '1px solid var(--ai-border)', background: 'var(--ai-surface-muted)' }}>
              <Collapse
                bordered={false}
                expandIcon={({ isActive }) => (
                  <DownOutlined rotate={isActive ? 180 : 0} style={{ fontSize: 11, color: 'var(--ai-text-muted)' }} />
                )}
                style={{ background: 'transparent' }}
                items={[
                  {
                    key: 'ctx',
                    label: (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai-text, #1E293B)' }}>
                        <BookOutlined style={{ marginRight: 8, color: 'var(--ai-primary)' }} />
                        教学上下文
                      </span>
                    ),
                    children: (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingBottom: 4 }}>
                        <div style={{ minWidth: 200, flex: '1 1 200px' }}>
                          <div style={{ fontSize: 11, color: 'var(--ai-text-muted)', marginBottom: 6 }}>课程</div>
                          <Select
                            value={selectedCourseId}
                            onChange={setSelectedCourseId}
                            style={{ width: '100%' }}
                            options={ALL_COURSES.map((c) => ({ value: c.id, label: c.name }))}
                          />
                        </div>
                        <div style={{ minWidth: 200, flex: '1 1 200px' }}>
                          <div style={{ fontSize: 11, color: 'var(--ai-text-muted)', marginBottom: 6 }}>学员（可选）</div>
                          <Select
                            allowClear
                            placeholder="未选择则回答通用分析"
                            value={selectedStudent}
                            onChange={setSelectedStudent}
                            style={{ width: '100%' }}
                            options={STUDENTS.map((s) => ({ value: s.id, label: s.name }))}
                          />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 12px', background: '#FAFBFF' }}>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <motion.div
                      key={`${msg.timestamp}-${i}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{
                        display: 'flex',
                        gap: 12,
                        marginBottom: 18,
                        flexDirection: isUser ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isUser
                            ? 'linear-gradient(145deg, #5B7CFF, var(--ai-primary, #4361EE))'
                            : 'linear-gradient(135deg, var(--ai-accent, #7C3AED), var(--ai-primary, #4361EE))',
                          boxShadow: isUser ? '0 4px 14px rgba(67, 97, 238, 0.35)' : '0 4px 14px rgba(124, 58, 237, 0.25)',
                        }}
                      >
                        {isUser ? (
                          <UserOutlined style={{ fontSize: 18, color: '#fff' }} />
                        ) : (
                          <RobotOutlined style={{ fontSize: 18, color: '#fff' }} />
                        )}
                      </div>
                      <div style={{ maxWidth: 'min(72%, 560px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div
                          style={{
                            borderRadius: CARD_RADIUS,
                            padding: '12px 16px',
                            background: isUser
                              ? 'linear-gradient(135deg, #5B7CFF 0%, var(--ai-primary, #4361EE) 55%, #3651D4 100%)'
                              : 'var(--ai-surface, #fff)',
                            color: isUser ? '#fff' : 'var(--ai-text)',
                            boxShadow: isUser ? '0 8px 24px rgba(67, 97, 238, 0.28)' : 'var(--ai-shadow-sm)',
                            border: isUser ? 'none' : '1px solid rgba(15, 23, 42, 0.06)',
                          }}
                        >
                          <FormattedMessageBody content={msg.content} isUser={isUser} />
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            textAlign: isUser ? 'right' : 'left',
                            color: isUser ? 'var(--ai-text-muted)' : 'var(--ai-text-muted)',
                            paddingLeft: isUser ? 0 : 4,
                            paddingRight: isUser ? 4 : 0,
                          }}
                        >
                          {msg.timestamp}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--ai-accent, #7C3AED), var(--ai-primary, #4361EE))',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)',
                    }}
                  >
                    <RobotOutlined style={{ fontSize: 18, color: '#fff' }} />
                  </div>
                  <div
                    style={{
                      background: 'var(--ai-surface, #fff)',
                      borderRadius: CARD_RADIUS,
                      padding: '12px 18px',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      boxShadow: 'var(--ai-shadow-sm)',
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--ai-text-muted)', marginBottom: 4 }}>正在生成回答</div>
                    <TypingDots />
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick prompts */}
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--ai-border)',
                background: '#fff',
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                flexWrap: 'nowrap',
              }}
            >
              {QUICK_PROMPTS.map((p, i) => (
                <motion.button
                  key={p}
                  type="button"
                  onClick={() => handleQuickPrompt(p)}
                  whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(67, 97, 238, 0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  style={{
                    flexShrink: 0,
                    cursor: 'pointer',
                    fontSize: 12,
                    borderRadius: 10,
                    padding: '8px 12px',
                    border: '1px solid var(--ai-border)',
                    background: 'linear-gradient(180deg, #fff 0%, var(--ai-surface-muted) 100%)',
                    color: 'var(--ai-text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <BulbOutlined style={{ color: 'var(--ai-primary)' }} />
                  {p}
                </motion.button>
              ))}
            </div>

            {/* Input */}
            <div
              style={{
                padding: '14px 16px 16px',
                borderTop: '1px solid var(--ai-border)',
                background: '#fff',
                display: 'flex',
                gap: 12,
                alignItems: 'stretch',
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 10,
                    border: '1px solid var(--ai-border)',
                    borderRadius: CARD_RADIUS,
                    padding: '4px 4px 4px 14px',
                    background: '#FAFBFF',
                    boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <Input.TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="输入您的问题…（Shift+Enter 换行）"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    variant="borderless"
                    style={{ flex: 1, fontSize: 13, padding: '8px 0', resize: 'none' }}
                  />
                  <motion.button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    whileHover={inputValue.trim() ? { scale: 1.02 } : {}}
                    whileTap={inputValue.trim() ? { scale: 0.98 } : {}}
                    style={{
                      alignSelf: 'flex-end',
                      marginBottom: 4,
                      marginRight: 4,
                      height: 40,
                      minWidth: 44,
                      padding: '0 18px',
                      borderRadius: 10,
                      border: 'none',
                      cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                      opacity: inputValue.trim() ? 1 : 0.45,
                      background: inputValue.trim()
                        ? 'linear-gradient(135deg, #5B7CFF, var(--ai-primary, #4361EE) 50%, #3651D4)'
                        : '#CBD5E1',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                      fontSize: 13,
                      boxShadow: inputValue.trim() ? '0 6px 18px rgba(67, 97, 238, 0.35)' : 'none',
                    }}
                  >
                    <SendOutlined />
                    发送
                  </motion.button>
                </div>
              </div>
              <Button icon={<ClearOutlined />} onClick={clearChat} style={{ height: 'auto', borderRadius: CARD_RADIUS }}>
                清空
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              style={{
                overflow: 'hidden',
                flexShrink: 0,
                marginLeft: 12,
              }}
            >
              <Card
                title={
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ai-text)' }}>分析上下文</span>
                }
                style={{
                  height: '100%',
                  borderRadius: CARD_RADIUS,
                  border: '1px solid var(--ai-border)',
                  boxShadow: 'var(--ai-shadow)',
                }}
                styles={{ body: { padding: 16, maxHeight: '100%', overflowY: 'auto' } }}
              >
                <div style={{ fontSize: 12, color: 'var(--ai-text-muted)', marginBottom: 12 }}>
                  当前课程 · {course.shortName}
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--ai-surface-muted)',
                    marginBottom: 14,
                    border: '1px solid var(--ai-border)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--ai-text-muted)', marginBottom: 8 }}>课程统计</div>
                  <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                    <div>
                      班级均分：<strong>{courseStats.classAvg}</strong> / {courseStats.maxTotal}
                    </div>
                    <div>
                      优势维度：<strong style={{ color: 'var(--ai-primary)' }}>{courseStats.strong.label}</strong>（{courseStats.strong.avgPct}%）
                    </div>
                    <div>
                      薄弱维度：<strong style={{ color: '#F59E0B' }}>{courseStats.weak.label}</strong>（{courseStats.weak.avgPct}%）
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ai-text-muted)' }}>
                      优秀 ≥90：{courseStats.excellent} 人 · 需关注 &lt;70：{courseStats.needHelp} 人
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--ai-text-muted)', marginBottom: 8 }}>选中学员</div>
                {studentCtx ? (
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid var(--ai-border)',
                      background: '#fff',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--ai-text)' }}>
                      {studentCtx.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ai-text-muted)', lineHeight: 1.8 }}>
                      <div>年级：{studentCtx.grade}</div>
                      <div>小组：{studentCtx.group}</div>
                      <div>
                        本课程得分：
                        <strong style={{ color: 'var(--ai-primary)' }}>
                          {computeCourseTotal(studentCtx.id, course)}
                        </strong>{' '}
                        （{GRADE_LABEL(computeCourseTotal(studentCtx.id, course))}）
                      </div>
                      <div>训练时长：{studentCtx.practiceHours} h</div>
                      <div>专注度：{Math.round(studentCtx.avgAttention * 100)}%</div>
                    </div>
                  </motion.div>
                ) : (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: '1px dashed var(--ai-border)',
                      fontSize: 12,
                      color: 'var(--ai-text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    未选择学员。展开上方「教学上下文」进行选择，或在对话中直接提问。
                  </div>
                )}
              </Card>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIAssistant;
