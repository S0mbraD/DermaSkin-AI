import React, { useMemo } from 'react';
import { Card, Row, Col, Typography, Space, Tag, List } from 'antd';
import {
  WarningOutlined, SafetyOutlined, CheckCircleOutlined,
  AimOutlined, SyncOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { ALL_COURSES, STUDENTS } from '@/data';
import { GRADE_COLOR } from '@/types';
import type { Student } from '@/types';
import { computeCourseTotal, computeMaxTotal, computeStudentRisk } from '@/utils/algorithms';
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

function maxRiskAcrossCourses(student: Student): number {
  return Math.max(...ALL_COURSES.map(c => computeStudentRisk(student, c)));
}

function avgSkillScore(student: Student): number {
  const vals = Object.values(student.skills);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function riskBand(r: number): 'high' | 'mid' | 'low' {
  if (r >= 38) return 'high';
  if (r >= 20) return 'mid';
  return 'low';
}

const RISK_COLOR = {
  high: '#EF4444',
  mid: '#F59E0B',
  low: '#05CD99',
} as const;

const DecisionTab: React.FC = () => {
  const students = STUDENTS;

  const riskRows = useMemo(
    () =>
      students.map(s => {
        const r = maxRiskAcrossCourses(s);
        const band = riskBand(r);
        return {
          student: s,
          risk: r,
          band,
          skill: avgSkillScore(s),
          attention: s.avgAttention * 100,
        };
      }),
    [students]
  );

  const riskKpi = useMemo(() => {
    let high = 0;
    let mid = 0;
    let low = 0;
    for (const row of riskRows) {
      if (row.band === 'high') high += 1;
      else if (row.band === 'mid') mid += 1;
      else low += 1;
    }
    return { high, mid, low };
  }, [riskRows]);

  const scatterOption = useMemo(() => {
    const pack = (band: 'high' | 'mid' | 'low') =>
      riskRows
        .filter(r => r.band === band)
        .map(r => ({
          name: r.student.name,
          value: [r.skill, r.attention, r.risk] as [number, number, number],
        }));

    const sizeFor = (data: { value: [number, number, number] }[]) =>
      data.map(d => ({
        ...d,
        symbolSize: Math.max(10, Math.min(34, 10 + d.value[2] * 0.45)),
      }));

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: {
          seriesName?: string;
          data: { name: string; value: [number, number, number] };
        }) => {
          const d = params.data;
          const bandLabel =
            params.seriesName === '高风险' ? '高' : params.seriesName === '中风险' ? '中' : '低';
          return `${d.name}<br/>技能均分：${d.value[0].toFixed(1)}<br/>专注度：${d.value[1].toFixed(1)}%<br/>风险（max）：${d.value[2]}（${bandLabel}）`;
        },
      },
      legend: {
        data: ['高风险', '中风险', '低风险'],
        top: 0,
        textStyle: { fontSize: 11, color: 'var(--text-muted)' },
      },
      grid: { top: 36, bottom: 28, left: 48, right: 24 },
      xAxis: {
        type: 'value' as const,
        name: '技能均分',
        nameLocation: 'middle' as const,
        nameGap: 28,
        min: 55,
        max: 100,
        axisLabel: { fontSize: 10, color: 'var(--text-muted)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      yAxis: {
        type: 'value' as const,
        name: '专注度（%）',
        nameLocation: 'middle' as const,
        nameGap: 36,
        min: 65,
        max: 100,
        axisLabel: { fontSize: 10, color: 'var(--text-muted)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: [
        {
          name: '高风险',
          type: 'scatter' as const,
          data: sizeFor(pack('high')),
          itemStyle: {
            color: RISK_COLOR.high,
            shadowBlur: 8,
            shadowColor: `${RISK_COLOR.high}44`,
          },
        },
        {
          name: '中风险',
          type: 'scatter' as const,
          data: sizeFor(pack('mid')),
          itemStyle: {
            color: RISK_COLOR.mid,
            shadowBlur: 8,
            shadowColor: `${RISK_COLOR.mid}44`,
          },
        },
        {
          name: '低风险',
          type: 'scatter' as const,
          data: sizeFor(pack('low')),
          itemStyle: {
            color: RISK_COLOR.low,
            shadowBlur: 8,
            shadowColor: `${RISK_COLOR.low}44`,
          },
        },
      ],
    };
  }, [riskRows]);

  const highRiskStudents = riskRows.filter(r => r.band === 'high').map(r => r.student.name);
  const midRiskStudents = riskRows.filter(r => r.band === 'mid').map(r => r.student.name);

  const weakCourseHint = useMemo(() => {
    const courseAvgs = ALL_COURSES.map(c => {
      const avg =
        students.reduce((sum, s) => sum + computeCourseTotal(s.id, c) / computeMaxTotal(c) * 100, 0) /
        students.length;
      return { id: c.id, shortName: c.shortName, avg };
    });
    return courseAvgs.sort((a, b) => a.avg - b.avg)[0];
  }, [students]);

  return (
    <div>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <KPICard
            icon={<WarningOutlined />}
            color="#EF4444"
            label="高风险"
            value={riskKpi.high}
            unit="人"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KPICard
            icon={<SafetyOutlined />}
            color="#F59E0B"
            label="中风险"
            value={riskKpi.mid}
            unit="人"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KPICard
            icon={<CheckCircleOutlined />}
            color="#05CD99"
            label="低风险"
            value={riskKpi.low}
            unit="人"
          />
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <AimOutlined style={{ color: 'var(--primary)' }} />
            <span>风险分布（横轴：技能均分，纵轴：专注度，气泡大小：跨课程最大风险）</span>
          </Space>
        }
        styles={{ body: { paddingTop: 8 } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <ReactECharts option={scatterOption} style={{ height: 360 }} notMerge lazyUpdate />
      </Card>

      <Card
        title={
          <Space>
            <SyncOutlined style={{ color: 'var(--primary)' }} />
            <span>PDCA 改进循环</span>
          </Space>
        }
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <Row gutter={[12, 12]}>
          {[
            {
              key: 'plan',
              title: 'Plan（计划）',
              status: '完成',
              color: '#05CD99',
              detail: '基于 EPA 与能力矩阵，完成学期目标与干预优先级排序。',
            },
            {
              key: 'do',
              title: 'Do（执行）',
              status: '进行中',
              color: '#4361EE',
              detail: '按课程开展模拟训练与视频复盘，配套形成性反馈与再练习。',
            },
            {
              key: 'check',
              title: 'Check（检查）',
              status: '待开始',
              color: '#94A3B8',
              detail: '汇总多源证据（评分、行为、里程碑）对照目标，识别偏差。',
            },
            {
              key: 'act',
              title: 'Act（处理）',
              status: '待开始',
              color: '#94A3B8',
              detail: '将结论固化到教学策略与个体化辅导计划，进入下一轮循环。',
            },
          ].map(step => (
            <Col xs={24} sm={12} lg={6} key={step.key}>
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid var(--border-light)',
                  padding: '14px 16px',
                  minHeight: 140,
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ color: 'var(--text-heading)' }}>{step.title}</Text>
                  <Tag color={step.color} style={{ border: 'none' }}>{step.status}</Tag>
                </div>
                <Paragraph style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }} type="secondary">
                  {step.detail}
                </Paragraph>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <WarningOutlined style={{ color: 'var(--primary)' }} />
            <span>风险评估与干预建议</span>
          </Space>
        }
        style={cardStyle}
      >
        <Title level={5} style={{ marginTop: 0, color: 'var(--text-heading)' }}>
          班级风险摘要
        </Title>
        <Paragraph style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          风险综合技能得分、专注度、出勤与成绩波动（算法见 <code>computeStudentRisk</code>），并在各课程上取<strong>最大值</strong>以反映“最薄弱场景”。
          当前高风险学员：{highRiskStudents.length ? highRiskStudents.join('、') : '无'}；中风险学员：
          {midRiskStudents.join('、')}。
        </Paragraph>
        <List
          size="small"
          dataSource={[
            {
              title: '分层强化',
              body: `对高风险学员安排一对一复盘与追加模拟；对中风险学员增加形成性反馈频次，并锁定薄弱 EPA 维度。`,
            },
            {
              title: '课程侧重',
              body: `班级平均相对偏弱的课程为「${weakCourseHint?.shortName ?? '—'}」(${weakCourseHint?.avg.toFixed(1) ?? '—'}%)，建议在集体备课中增加该模块的示范与分解步骤。`,
            },
            {
              title: '数据驱动',
              body: '将 W1–W8 成长曲线与 EPA 里程碑对齐，在 PDCA 的 Check 阶段用同一套指标复核，避免“感觉改善”与证据脱节。',
            },
          ]}
          renderItem={item => (
            <List.Item style={{ border: 'none', padding: '8px 0' }}>
              <Space align="start">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: GRADE_COLOR(72),
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <Text strong style={{ color: 'var(--text-heading)' }}>{item.title}</Text>
                  <Paragraph style={{ margin: '4px 0 0', fontSize: 12 }} type="secondary">
                    {item.body}
                  </Paragraph>
                </div>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <AIInsightCard
        title="AI 决策支持洞察"
        insights={[
          '风险分布模型预测显示高风险学员集中在技能均分偏低且专注度不足的象限，建议优先安排一对一复盘与追加模拟训练。',
          'PDCA循环当前处于"执行"阶段，建议在第4周末启动"检查"环节，用多源证据对照目标识别偏差。',
          '课程维度分析表明薄弱课程需在集体备课中增加示范与分解步骤，同时为中风险学员增加形成性反馈频次。',
        ]}
        type="warning"
        style={{ marginTop: 16 }}
      />
    </div>
  );
};

export default DecisionTab;
