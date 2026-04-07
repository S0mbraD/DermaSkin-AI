import React, { useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Table,
  Progress,
  Collapse,
  Descriptions,
  Typography,
  Space,
  Avatar,
} from 'antd';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import { DatabaseOutlined, AimOutlined, TeamOutlined, FileSearchOutlined, CalendarOutlined } from '@ant-design/icons';
import { EPA_LIST, ALL_COURSES, STUDENTS } from '@/data';
import type { EPA } from '@/types';
import AIInsightCard from '@/components/AIInsightCard';

const { Title, Text, Paragraph } = Typography;

/** Resolved for ECharts (option does not resolve CSS variables). Matches :root in index.css */
const EC = {
  primary: '#4361EE',
  success: '#05CD99',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#7C3AED',
  textHeading: '#2B3674',
  textSecondary: '#707EAE',
  textMuted: '#A3AED0',
} as const;

const BANNER = {
  sessions: 6,
  students: 8,
  evidence: 42,
  lastSession: '2026-03-15',
} as const;

const TARGET_PCT = 85;

const CATEGORY_ORDER: EPA['category'][] = ['基础操作', '诊断技术', '治疗操作', '沟通能力'];

const CATEGORY_META: Record<
  EPA['category'],
  { accentHex: string; tint: string; blurb: string }
> = {
  基础操作: {
    accentHex: EC.primary,
    tint: 'rgba(67, 97, 238, 0.10)',
    blurb: '无菌技术、标本获取与处理等安全规范类能力。',
  },
  诊断技术: {
    accentHex: EC.success,
    tint: 'rgba(5, 205, 153, 0.10)',
    blurb: '镜检、活检、影像判读等诊断链条核心技能。',
  },
  治疗操作: {
    accentHex: EC.warning,
    tint: 'rgba(245, 158, 11, 0.12)',
    blurb: '治疗性操作与随访管理相关的实践能力。',
  },
  沟通能力: {
    accentHex: EC.purple,
    tint: 'rgba(124, 58, 237, 0.10)',
    blurb: '知情同意、结果解释与临床思维表达。',
  },
};

const MILESTONE_LEVEL_ROWS = [
  {
    key: 'l1',
    code: 'L1',
    name: '观察级',
    summary: '在真实临床情境中观察标准流程，理解关键步骤与风险点。',
  },
  {
    key: 'l2',
    code: 'L2',
    name: '协助级',
    summary: '在直接监督下参与操作，能完成部分步骤并主动报告异常。',
  },
  {
    key: 'l3',
    code: 'L3',
    name: '独立级',
    summary: '在常规情形下独立完成操作，质量稳定并符合规范。',
  },
  {
    key: 'l4',
    code: 'L4',
    name: '指导级',
    summary: '能处理复杂情形、优化流程，并对同伴进行教学与质控。',
  },
] as const;

function avgEpaLevelPct(epaId: string): number {
  const levels = STUDENTS.map(s => s.epaProgress[epaId]?.level ?? 0);
  const sum = levels.reduce((a, b) => a + b, 0);
  const avg = sum / Math.max(STUDENTS.length, 1);
  return Math.round((avg / 4) * 100);
}

function categoryAchievementSeries(): { labels: string[]; values: number[] } {
  const labels: string[] = [];
  const values: number[] = [];
  for (const cat of CATEGORY_ORDER) {
    const epas = EPA_LIST.filter(e => e.category === cat);
    if (!epas.length) continue;
    let sum = 0;
    let n = 0;
    for (const epa of epas) {
      for (const s of STUDENTS) {
        const lvl = s.epaProgress[epa.id]?.level ?? 0;
        sum += (lvl / 4) * 100;
        n++;
      }
    }
    labels.push(cat);
    values.push(n ? Math.round(sum / n) : 0);
  }
  return { labels, values };
}

const cardBase: React.CSSProperties = {
  borderRadius: 14,
  border: '1px solid rgba(43, 54, 116, 0.08)',
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
};

const FrameworkTab: React.FC = () => {
  const { labels: radarLabels, values: radarValues } = useMemo(
    () => categoryAchievementSeries(),
    []
  );

  const radarOption = useMemo(
    () => ({
      color: [EC.primary, EC.textMuted] as const,
      textStyle: { color: EC.textSecondary, fontSize: 11 },
      tooltip: { trigger: 'item' as const },
      legend: {
        data: ['班级达成率', `目标 ${TARGET_PCT}%`] as const,
        bottom: 0,
        textStyle: { fontSize: 11, color: EC.textSecondary },
      },
      radar: {
        radius: '62%',
        center: ['50%', '46%'],
        indicator: radarLabels.map(name => ({
          name,
          max: 100,
        })),
        splitNumber: 4,
        axisName: { color: EC.textSecondary, fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(112, 126, 174, 0.25)' } },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(67, 97, 238, 0.06)', 'rgba(67, 97, 238, 0.02)'],
          },
        },
      },
      series: [
        {
          name: 'EPA 达成',
          type: 'radar' as const,
          symbolSize: 6,
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.18 },
          data: [
            {
              value: radarValues,
              name: '班级达成率',
              itemStyle: { color: EC.primary },
              areaStyle: { color: EC.primary },
            },
            {
              value: radarLabels.map(() => TARGET_PCT),
              name: `目标 ${TARGET_PCT}%`,
              symbol: 'none' as const,
              lineStyle: { width: 2, type: 'dashed' as const, color: EC.textMuted },
              areaStyle: { opacity: 0 },
              itemStyle: { color: EC.textMuted },
            },
          ],
        },
      ],
    }),
    [radarLabels, radarValues]
  );

  const milestoneExplainColumns = [
    {
      title: '级别',
      dataIndex: 'code',
      width: 72,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 96,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '能力定位',
      dataIndex: 'summary',
    },
  ];

  const epaMilestoneColumns = [
    {
      title: '等级',
      key: 'level',
      width: 64,
      render: (_: unknown, r: { level: number }) => `L${r.level}`,
    },
    {
      title: '里程碑',
      dataIndex: 'label',
      width: 88,
    },
    {
      title: '行为标准',
      dataIndex: 'criteria',
      ellipsis: true,
    },
  ];

  const collapseItems = EPA_LIST.map(epa => {
    const pct = avgEpaLevelPct(epa.id);
    const meta = CATEGORY_META[epa.category];
    return {
      key: epa.id,
      label: (
        <Space wrap size={8}>
          <Text strong style={{ color: 'var(--text-heading)' }}>
            {epa.code} {epa.name}
          </Text>
          <Tag color={meta.accentHex} style={{ marginInlineEnd: 0 }}>
            {epa.category}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            权重 {epa.weight.toFixed(1)}
          </Text>
        </Space>
      ),
      children: (
        <div>
          <Paragraph style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
            {epa.description}
          </Paragraph>
          <div style={{ marginBottom: 12 }}>
            <Space align="center">
              <Text style={{ fontSize: 12, color: 'var(--text-muted)' }}>班级平均达成度</Text>
              <Progress
                percent={pct}
                strokeColor={{ from: 'var(--primary)', to: 'var(--success)' }}
                trailColor="rgba(163, 174, 208, 0.25)"
                size="small"
                style={{ width: 220 }}
              />
            </Space>
          </div>
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            columns={epaMilestoneColumns}
            dataSource={epa.milestones}
          />
        </div>
      ),
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div
          style={{
            borderRadius: 14,
            padding: '14px 18px',
            background:
              'linear-gradient(90deg, rgba(67, 97, 238, 0.12) 0%, rgba(5, 205, 153, 0.10) 100%)',
            border: '1px solid rgba(67, 97, 238, 0.18)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'space-between',
          }}
        >
          <Space size={12} align="center">
            <Avatar
              size={40}
              style={{ background: 'var(--primary)', color: '#fff' }}
              icon={<DatabaseOutlined />}
            />
            <div>
              <Text strong style={{ color: 'var(--text-heading)', fontSize: 14 }}>
                循证数据源
              </Text>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                对接实训会话、过程性证据与 EPA 评估记录（演示数据集）
              </div>
            </div>
          </Space>
          <Space size={28} wrap split={<span style={{ color: 'var(--text-muted)' }}>|</span>}>
            <Space size={6}>
              <TeamOutlined style={{ color: 'var(--primary)' }} />
              <Text type="secondary">会话</Text>
              <Text strong style={{ color: 'var(--text-heading)' }}>
                {BANNER.sessions}
              </Text>
            </Space>
            <Space size={6}>
              <AimOutlined style={{ color: 'var(--success)' }} />
              <Text type="secondary">学员</Text>
              <Text strong style={{ color: 'var(--text-heading)' }}>
                {BANNER.students}
              </Text>
            </Space>
            <Space size={6}>
              <FileSearchOutlined style={{ color: 'var(--purple)' }} />
              <Text type="secondary">证据条目</Text>
              <Text strong style={{ color: 'var(--text-heading)' }}>
                {BANNER.evidence}
              </Text>
            </Space>
            <Space size={6}>
              <CalendarOutlined style={{ color: 'var(--warning)' }} />
              <Text type="secondary">最近会话</Text>
              <Text strong style={{ color: 'var(--text-heading)' }}>
                {BANNER.lastSession}
              </Text>
            </Space>
          </Space>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <Card
          style={cardBase}
          styles={{ body: { padding: 20 } }}
          title={
            <Title level={5} style={{ margin: 0, color: 'var(--text-heading)' }}>
              EPA 能力框架与 CBME
            </Title>
          }
        >
          <Paragraph style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>
            本中心以<strong style={{ color: 'var(--text-heading)' }}>胜任力导向医学教育（CBME）</strong>
            为理论底座：以真实临床任务为单元，将能力拆解为可观察、可评估、可累积的 EPA（Entrustable
            Professional Activities），并通过里程碑刻画从监督到信任的进阶路径。
          </Paragraph>
          <Descriptions
            column={{ xs: 1, sm: 2, md: 3 }}
            size="small"
            labelStyle={{ color: 'var(--text-muted)', width: 108 }}
            contentStyle={{ color: 'var(--text-secondary)' }}
          >
            <Descriptions.Item label="框架版本">DermaSkin AI · EPA v1</Descriptions.Item>
            <Descriptions.Item label="覆盖课程">{ALL_COURSES.length} 门数字化实训</Descriptions.Item>
            <Descriptions.Item label="EPA 条目">{EPA_LIST.length} 项核心活动</Descriptions.Item>
            <Descriptions.Item label="映射逻辑">课程技能 → EPA → 里程碑证据链</Descriptions.Item>
            <Descriptions.Item label="信任决策">基于多源证据的委派等级（L1–L4）</Descriptions.Item>
            <Descriptions.Item label="质量目标">类别达成度对标 {TARGET_PCT}% 教学目标</Descriptions.Item>
          </Descriptions>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Row gutter={[14, 14]}>
          {CATEGORY_ORDER.map(cat => {
            const epas = EPA_LIST.filter(e => e.category === cat);
            const meta = CATEGORY_META[cat];
            return (
              <Col xs={24} sm={12} xl={6} key={cat}>
                <Card
                  style={{
                    ...cardBase,
                    height: '100%',
                    background: meta.tint,
                    borderColor: `${meta.accentHex}33`,
                  }}
                  styles={{ body: { padding: 16 } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text strong style={{ fontSize: 15, color: 'var(--text-heading)' }}>
                      {cat}
                    </Text>
                    <Tag color={meta.accentHex} style={{ margin: 0 }}>
                      {epas.length} 项 EPA
                    </Tag>
                  </div>
                  <Paragraph style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {meta.blurb}
                  </Paragraph>
                </Card>
              </Col>
            );
          })}
        </Row>
      </motion.div>

      <Row gutter={[14, 14]}>
        <Col xs={24} lg={10}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
          >
            <Card
              style={{ ...cardBase, height: '100%' }}
              styles={{ body: { padding: 16 } }}
              title={
                <Text strong style={{ color: 'var(--text-heading)' }}>
                  里程碑等级说明
                </Text>
              }
            >
              <Table
                size="small"
                pagination={false}
                rowKey="key"
                columns={milestoneExplainColumns}
                dataSource={[...MILESTONE_LEVEL_ROWS]}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={14}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
          >
            <Card
              style={cardBase}
              styles={{ body: { padding: '8px 8px 4px' } }}
              title={
                <Text strong style={{ color: 'var(--text-heading)' }}>
                  班级 EPA 类别达成度 vs {TARGET_PCT}% 目标
                </Text>
              }
            >
              <ReactECharts
                option={radarOption}
                style={{ height: 340 }}
                notMerge
                lazyUpdate
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.16 }}
      >
        <Card
          style={cardBase}
          styles={{ body: { padding: 16 } }}
          title={
            <Text strong style={{ color: 'var(--text-heading)' }}>
              EPA 条目与里程碑明细
            </Text>
          }
        >
          <Collapse items={collapseItems} bordered={false} defaultActiveKey={[EPA_LIST[0]?.id]} />
        </Card>
      </motion.div>

      <AIInsightCard
        title="AI 框架覆盖洞察"
        insights={[
          'EPA框架覆盖度分析显示"治疗操作"和"沟通能力"类别的达成率距85%目标仍有差距，建议增加相关实训课时。',
          '里程碑分布表明多数学员集中在L2（协助级），向L3（独立级）跃迁是当前瓶颈，建议设计专项突破训练。',
          '各能力类别间存在交叉依赖，基础操作的扎实程度直接影响诊断技术与治疗操作的进阶速度。',
        ]}
        type="success"
        style={{ marginTop: 16 }}
      />
    </div>
  );
};

export default FrameworkTab;
