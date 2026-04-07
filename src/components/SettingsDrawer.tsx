import React, { useState } from 'react';
import {
  Drawer, Tabs, Form, Input, Select, Switch, Slider, Radio,
  Space, Button, Tag, Divider, Typography, message, Card, Alert,
} from 'antd';
import type { TabsProps } from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LoadingOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { testConnection } from '@/services/aiService';

export interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const THEME_COLORS = ['#4361EE', '#7C3AED', '#05CD99', '#E84393', '#FD7015'] as const;

const VISION_MODELS = [
  { value: 'qwen-vl-max-latest', label: 'Qwen-VL-Max (推荐，最强视觉)' },
  { value: 'qwen-vl-plus-latest', label: 'Qwen-VL-Plus (均衡)' },
  { value: 'qwen-omni-turbo-latest', label: 'Qwen-Omni-Turbo (快速)' },
  { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
  { value: 'gpt-4-vision-preview', label: 'GPT-4V (OpenAI)' },
];

const AUDIO_MODELS = [
  { value: 'qwen-audio-turbo-latest', label: 'Qwen-Audio-Turbo (推荐)' },
  { value: 'qwen2-audio-instruct', label: 'Qwen2-Audio-Instruct' },
  { value: 'whisper-1', label: 'Whisper-1 (OpenAI)' },
];

const API_PRESETS = [
  { label: '通义千问 DashScope', value: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { label: 'OpenAI', value: 'https://api.openai.com/v1' },
  { label: '自定义', value: '' },
];

const labelStyle: React.CSSProperties = {
  color: '#2B3674',
  fontWeight: 600,
  fontSize: 13,
};

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose }) => {
  const { settings, updateAI, updateTheme, updateNotifications, resetAll } =
    useSettingsStore();
  const { ai, theme, notifications } = settings;

  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [customBaseUrl, setCustomBaseUrl] = useState('');

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnResult(null);
    try {
      const result = await testConnection(ai);
      setConnResult(result);
      if (result.ok) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      setConnResult({ ok: false, message: msg });
      message.error(msg);
    }
    setTestingConn(false);
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'ai',
      label: (
        <span>
          <ApiOutlined style={{ marginRight: 4 }} />
          AI 配置
        </span>
      ),
      children: (
        <div style={{ paddingTop: 4 }}>
          <Alert
            message="通义千问多模态 API 配置"
            description="配置 Qwen-VL 视觉模型和 Qwen-Audio 语音模型，用于视频分析和语音转录。需要在阿里云 DashScope 平台获取 API Key。"
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 10 }}
          />

          <Form layout="vertical" style={{ maxWidth: '100%' }}>
            <Form.Item label={<span style={labelStyle}>API 服务商</span>}>
              <Select
                value={
                  API_PRESETS.find((p) => p.value === ai.baseUrl)
                    ? ai.baseUrl
                    : ''
                }
                onChange={(v) => {
                  if (v) {
                    updateAI({ baseUrl: v });
                  }
                }}
                options={API_PRESETS}
              />
              {!API_PRESETS.find((p) => p.value === ai.baseUrl) && (
                <Input
                  value={customBaseUrl || ai.baseUrl}
                  onChange={(e) => {
                    setCustomBaseUrl(e.target.value);
                    updateAI({ baseUrl: e.target.value });
                  }}
                  placeholder="https://your-api-endpoint/v1"
                  style={{ marginTop: 8 }}
                />
              )}
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>API 密钥</span>}>
              <Input.Password
                value={ai.apiKey}
                onChange={(e) => updateAI({ apiKey: e.target.value })}
                placeholder="sk-... (DashScope API Key)"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              label={
                <span style={labelStyle}>
                  <ExperimentOutlined style={{ marginRight: 4 }} />
                  视觉分析模型
                </span>
              }
            >
              <Select
                value={ai.visionModel}
                onChange={(v) => updateAI({ visionModel: v })}
                options={VISION_MODELS}
              />
              <div style={{ fontSize: 11, color: '#A3AED0', marginTop: 4 }}>
                推荐使用 Qwen-VL-Max 以获得最佳的视频帧分析效果
              </div>
            </Form.Item>

            <Form.Item
              label={<span style={labelStyle}>语音识别模型</span>}
            >
              <Select
                value={ai.audioModel}
                onChange={(v) => updateAI({ audioModel: v })}
                options={AUDIO_MODELS}
              />
            </Form.Item>

            <Divider style={{ margin: '12px 0' }}>分析参数</Divider>

            <Form.Item label={<span style={labelStyle}>帧提取间隔（秒）</span>}>
              <Slider
                min={3}
                max={30}
                value={ai.frameInterval}
                onChange={(v) => updateAI({ frameInterval: v })}
                marks={{ 3: '3s', 10: '10s', 20: '20s', 30: '30s' }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                间隔越小提取帧越多，分析越精确但耗时更长
              </Typography.Text>
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>最大帧数</span>}>
              <Slider
                min={5}
                max={40}
                value={ai.maxFrames}
                onChange={(v) => updateAI({ maxFrames: v })}
                marks={{ 5: '5', 10: '10', 20: '20', 40: '40' }}
              />
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>最大 Token 数</span>}>
              <Slider
                min={1024}
                max={8192}
                step={512}
                value={ai.maxTokens}
                onChange={(v) => updateAI({ maxTokens: v })}
              />
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                当前: {ai.maxTokens} tokens
              </Typography.Text>
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>温度参数</span>}>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={ai.temperature}
                onChange={(v) => updateAI({ temperature: v })}
              />
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                当前: {ai.temperature.toFixed(2)} — 越低结果越确定
              </Typography.Text>
            </Form.Item>

            <Form.Item label={<span style={labelStyle}>语音转录</span>}>
              <Switch
                checked={ai.enableTranscription}
                onChange={(v) => updateAI({ enableTranscription: v })}
              />
              <span style={{ marginLeft: 8, fontSize: 12, color: '#707EAE' }}>
                {ai.enableTranscription ? '开启 — 将提取音频并转录' : '关闭'}
              </span>
            </Form.Item>

            <Form.Item>
              <Space wrap>
                <Button
                  type="primary"
                  loading={testingConn}
                  icon={testingConn ? <LoadingOutlined /> : <ApiOutlined />}
                  onClick={handleTestConnection}
                  style={{ borderRadius: 8 }}
                >
                  测试连接
                </Button>
                <Button
                  onClick={() => message.success('配置已自动保存')}
                  style={{ borderRadius: 8 }}
                >
                  保存提示
                </Button>
              </Space>
              {connResult && (
                <div style={{ marginTop: 8 }}>
                  <Tag
                    icon={
                      connResult.ok ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                    color={connResult.ok ? 'success' : 'error'}
                  >
                    {connResult.message}
                  </Tag>
                </div>
              )}
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'ui',
      label: '界面设置',
      children: (
        <div style={{ paddingTop: 4 }}>
          <Form layout="vertical">
            <Form.Item label={<span style={labelStyle}>主题色</span>}>
              <Radio.Group
                value={theme.primaryColor}
                onChange={(e) => updateTheme({ primaryColor: e.target.value })}
              >
                <Space size={12} wrap>
                  {THEME_COLORS.map((c) => (
                    <Radio key={c} value={c} style={{ marginInlineEnd: 0 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: c,
                          border:
                            theme.primaryColor === c
                              ? '2px solid #2B3674'
                              : '2px solid #E0E6F5',
                          boxShadow:
                            theme.primaryColor === c
                              ? `0 0 0 3px ${c}30`
                              : 'none',
                          verticalAlign: 'middle',
                        }}
                      />
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>字体大小</span>}>
              <Radio.Group
                value={theme.fontSize}
                onChange={(e) => updateTheme({ fontSize: e.target.value })}
              >
                <Radio value="small">小</Radio>
                <Radio value="medium">中</Radio>
                <Radio value="large">大</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>显示动画效果</span>}>
              <Switch
                checked={theme.showAnimations}
                onChange={(v) => updateTheme({ showAnimations: v })}
              />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>紧凑模式</span>}>
              <Switch
                checked={theme.compactMode}
                onChange={(v) => updateTheme({ compactMode: v })}
              />
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'notify',
      label: '通知与提醒',
      children: (
        <div style={{ paddingTop: 4 }}>
          <Form layout="vertical">
            <Form.Item label={<span style={labelStyle}>分析完成通知</span>}>
              <Switch
                checked={notifications.analysisDone}
                onChange={(v) => updateNotifications({ analysisDone: v })}
              />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>风险学员预警</span>}>
              <Switch
                checked={notifications.riskAlert}
                onChange={(v) => updateNotifications({ riskAlert: v })}
              />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>预警阈值</span>}>
              <Slider
                min={30}
                max={80}
                value={notifications.alertThreshold}
                onChange={(v) => updateNotifications({ alertThreshold: v })}
                marks={{ 30: '30', 50: '50', 80: '80' }}
              />
            </Form.Item>
            <Form.Item label={<span style={labelStyle}>声音提醒</span>}>
              <Switch
                checked={notifications.soundEnabled}
                onChange={(v) => updateNotifications({ soundEnabled: v })}
              />
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'data',
      label: '数据管理',
      children: (
        <div style={{ paddingTop: 4 }}>
          <Typography.Text
            style={{ color: '#2B3674', marginBottom: 12, fontWeight: 600, display: 'block' }}
          >
            导出数据
          </Typography.Text>
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            <Button block onClick={() => message.success('已开始导出学员数据')}>
              导出学员数据
            </Button>
            <Button block onClick={() => message.success('已开始导出评估报告')}>
              导出评估报告
            </Button>
          </Space>

          <Divider style={{ margin: '20px 0' }} />

          <Card
            size="small"
            title={<span style={{ color: '#C41D3A', fontWeight: 600 }}>危险区域</span>}
            style={{ borderRadius: 14, border: '1px solid #F5A4B8', background: '#FFF5F7' }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <Typography.Paragraph
              style={{ color: '#707EAE', marginBottom: 12, fontSize: 13 }}
            >
              重置后将恢复默认设置，此操作无法撤销。
            </Typography.Paragraph>
            <Button
              danger
              onClick={() => {
                resetAll();
                message.warning('已重置所有设置');
              }}
            >
              重置所有设置
            </Button>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <div>
          <Typography.Title level={5} style={{ margin: 0, color: '#2B3674' }}>
            系统设置
          </Typography.Title>
          <Typography.Text style={{ fontSize: 12, color: '#A3AED0' }}>
            DermaSkin AI · 皮肤科培训评估
          </Typography.Text>
        </div>
      }
      placement="right"
      width={500}
      onClose={onClose}
      open={open}
      destroyOnClose={false}
      styles={{
        body: { padding: '12px 20px 24px', background: '#F7F9FC' },
        header: { borderBottom: '1px solid #E8EDF5' },
      }}
    >
      <Tabs
        defaultActiveKey="ai"
        items={tabItems}
        style={{ color: '#707EAE' }}
        tabBarStyle={{ marginBottom: 8 }}
      />
    </Drawer>
  );
};

export default SettingsDrawer;
