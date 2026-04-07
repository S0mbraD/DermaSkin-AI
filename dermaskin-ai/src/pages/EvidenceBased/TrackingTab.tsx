import React, { useMemo, useState } from 'react';
import { Card, Row, Col, Select, Progress, Typography, Space, Tag } from 'antd';
import {
  TrophyOutlined, RiseOutlined, AlertOutlined,
  LineChartOutlined, BookOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { ALL_COURSES, EPA_LIST, STUDENTS } from '@/data';
import { GRADE_COLOR, GRADE_LABEL } from '@/types';
import type { Student } from '@/types';
import { computeCourseTotal, computeMaxTotal } from '@/utils/algorithms';
import AIInsightCard from '@/components/AIInsightCard';

const { Text, Paragraph, Title } = Typography;

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: '1px solid var(--border-light)',
  background: 'var(--bg-card)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const KPICard: React.FC<{
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number;
  unit: string;
}> = ({ icon, color, label, value, unit }) => (
  <div
    style={{
      ...cardStyle,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: `${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontSize: 17,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color }}>{value}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>
      </div>
    </div>
  </div>
);

function computeLearningIndex(student: Student): number {
  const avgCoursePct =
    ALL_COURSES.reduce((sum, c) => {
      const total = computeCourseTotal(student.id, c);
      const max = computeMaxTotal(c);
      return sum + (max ? (total / max) * 100 : 0);
    }, 0) / ALL_COURSES.length;
  const epaAvg =
    Object.values(student.epaProgress).reduce((a, e) => a + e.level, 0) /
    Object.keys(student.epaProgress).length;
  return 0.5 * avgCoursePct + 0.5 * (epaAvg / 4) * 100;
}

function outcomeTier(student: Student): 'excellent' | 'good' | 'watch' {
  const li = computeLearningIndex(student);
  if (li >= 75) return 'excellent';
  if (li >= 55) return 'good';
  return 'watch';
}

const TrackingTab: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number>(1);

  const students = STUDENTS;

  const tierCounts = useMemo(() => {
    let excellent = 0;
    let good = 0;
    let watch = 0;
    for (const s of students) {
      const t = outcomeTier(s);
      if (t === 'excellent') excellent += 1;
      else if (t === 'good') good += 1;
      else watch += 1;
    }
    return { excellent, good, watch };
  }, [students]);

  const topFour = useMemo(() => {
    return [...students]
      .sort((a, b) => computeLearningIndex(b) - computeLearningIndex(a))
      .slice(0, 4);
  }, [students]);

  const studentColors = ['#4361EE', '#05CD99', '#7C3AED', '#F59E0B'] as const;

  const growthChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: {
        data: topFour.map(s => s.name),
        top: 0,
        textStyle: { fontSize: 11, color: 'var(--text-muted)' },
      },
      grid: { top: 36, bottom: 24, left: 44, right: 16 },
      xAxis: {
        type: 'category' as const,
        data: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
        axisLabel: { fontSize: 10, color: 'var(--text-muted)' },
      },
      yAxis: {
        type: 'value' as const,
        min: 55,
        max: 100,
        axisLabel: { fontSize: 10, color: 'var(--text-muted)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: topFour.map((s, i) => ({
        name: s.name,
        type: 'line' as const,
        data: s.recentScores,
        smooth: true,
        lineStyle: { color: studentColors[i], width: 2 },
        itemStyle: { color: studentColors[i] },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${studentColors[i]}22` },
              { offset: 1, color: `${studentColors[i]}00` },
            ],
          },
        },
      })),
    }),
    [topFour]
  );

  const selected = useMemo(
    () => students.find(s => s.id === selectedId) ?? students[0],
    [students, selectedId]
  );

  const selectedLi = computeLearningIndex(selected);
  const gradeLabel = GRADE_LABEL(Math.round(selectedLi));
  const gradeColor = GRADE_COLOR(Math.round(selectedLi));

  return (
    <div>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <KPICard
            icon={<TrophyOutlined />}
            color="#05CD99"
            label="优秀学员"
            value={tierCounts.excellent}
            unit="人"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KPICard
            icon={<RiseOutlined />}
            color="#4361EE"
            label="良好学员"
            value={tierCounts.good}
            unit="人"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KPICard
            icon={<AlertOutlined />}
            color="#F59E0B"
            label="需关注学员"
            value={tierCounts.watch}
            unit="人"
          />
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <LineChartOutlined style={{ color: 'var(--primary)' }} />
            <span>学员成长趋势（综合表现前 4 名 · W1–W8）</span>
          </Space>
        }
        styles={{ body: { paddingTop: 8 } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <ReactECharts option={growthChartOption} style={{ height: 320 }} notMerge lazyUpdate />
      </Card>

      <Card
        title={
          <Space>
            <RiseOutlined style={{ color: 'var(--primary)' }} />
            <span>EPA 里程碑进度</span>
            <Select
              size="small"
              value={selectedId}
              onChange={setSelectedId}
              style={{ minWidth: 160 }}
              options={students.map(s => ({ value: s.id, label: `${s.name}（${s.group}）` }))}
            />
            <Tag color={gradeColor} style={{ marginInlineStart: 8 }}>
              学习指数 {selectedLi.toFixed(1)} · {gradeLabel}
            </Tag>
          </Space>
        }
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <Row gutter={[12, 12]}>
          {EPA_LIST.map(epa => {
            const prog = selected.epaProgress[epa.id];
            const level = prog?.level ?? 1;
            const milestone = epa.milestones[level - 1];
            const pct = (level / 4) * 100;
            return (
              <Col xs={24} sm={12} lg={8} key={epa.id}>
                <div
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--border-light)',
                    padding: '12px 14px',
                    background: 'var(--bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13, color: 'var(--text-heading)' }}>
                      {epa.code} {epa.name}
                    </Text>
                    <Tag color="blue">Lv.{level}</Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                    {epa.category}
                  </Text>
                  <Progress
                    percent={pct}
                    strokeColor={{ from: '#4361EE', to: '#05CD99' }}
                    size="small"
                    format={() => `${level}/4`}
                  />
                  {milestone && (
                    <Paragraph style={{ margin: '10px 0 0', fontSize: 11, marginBottom: 0 }} type="secondary">
                      <strong style={{ color: 'var(--text-heading)' }}>{milestone.label}</strong>
                      ：{milestone.criteria}
                    </Paragraph>
                  )}
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    最近评估：{prog?.lastAssessed ?? '—'}
                  </Text>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <BookOutlined style={{ color: 'var(--primary)' }} />
            <span>CBME 里程碑等级说明</span>
          </Space>
        }
        style={cardStyle}
      >
        <Title level={5} style={{ marginTop: 0, color: 'var(--text-heading)' }}>
          以能力为导向的医学教育（CBME）与 EPA 等级
        </Title>
        <Paragraph style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          本中心将皮肤科关键操作拆解为若干 EPA（可托付专业活动），每个 EPA 下设置 4 级里程碑，对应从观察到独立执业的渐进能力。
          等级与临床监督强度挂钩：等级越高，所需直接监督越少，越接近可独立、可带教的目标。
        </Paragraph>
        <Row gutter={[12, 12]}>
          {[
            { lv: 1, title: '观察级', desc: '在真实场景中以观察与复述为主，建立安全与流程框架。' },
            { lv: 2, title: '协助级', desc: '在直接监督下能完成关键步骤，错误可被即时纠正。' },
            { lv: 3, title: '独立级', desc: '在常规情境下可独立完成，符合规范与质量要求。' },
            { lv: 4, title: '指导级', desc: '能处理复杂病例、质控与教学，具备带教与反馈能力。' },
          ].map(row => (
            <Col xs={24} sm={12} key={row.lv}>
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid var(--border-light)',
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, #4361EE08 0%, #05CD9908 100%)',
                }}
              >
                <Text strong style={{ color: '#4361EE' }}>L{row.lv}</Text>
                <Text strong style={{ marginLeft: 8, color: 'var(--text-heading)' }}>{row.title}</Text>
                <Paragraph style={{ margin: '8px 0 0', fontSize: 12, marginBottom: 0 }} type="secondary">
                  {row.desc}
                </Paragraph>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      <AIInsightCard
        title="AI 成长追踪洞察"
        insights={[
          '学员成长趋势显示前4名学员W1–W8成绩稳步上升，建议关注增长速率放缓的学员，及时介入辅导。',
          'EPA里程碑进度分析表明，多数学员在EPA-3（皮肤活检操作）和EPA-5（皮肤镜检查）上进展较慢，建议增加针对性模拟训练。',
          '综合学习指数与CBME等级对照，建议为接近独立级的学员安排综合考核，加速向指导级过渡。',
        ]}
        type="info"
        style={{ marginTop: 16 }}
      />
    </div>
  );
};

export default TrackingTab;
