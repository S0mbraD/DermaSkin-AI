import type { CourseConfig } from '@/types';
import { fmtTime } from '@/utils/format';

export const dermaFungal: CourseConfig = {
  id: 'derma_fungal',
  name: '皮肤科真菌镜检操作',
  shortName: '真菌镜检',
  videoSrc: '/videos/derma_fungal.mp4',

  rubric: [
    { key: 'introFlow', label: '介绍自己及检查流程', maxScore: 10 },
    { key: 'specimen', label: '标本采集', maxScore: 20 },
    { key: 'slidePrep', label: '制片方法', maxScore: 25 },
    { key: 'microscopy', label: '镜下观察', maxScore: 25 },
    { key: 'clinicalMeaning', label: '临床意义阐述', maxScore: 20 },
  ],

  evals: {
    1: { scores: [5, 18, 23, 24, 17], timestamps: [10, 45, 95, 155, 210] },
    2: { scores: [8, 18, 22, 23, 17], timestamps: [12, 48, 100, 160, 215] },
    3: { scores: [9, 18, 22, 20, 15], timestamps: [15, 50, 105, 165, 220] },
    4: { scores: [9, 18, 23, 24, 19], timestamps: [8, 42, 90, 150, 205] },
    5: { scores: [9, 18, 23, 22, 18], timestamps: [18, 55, 110, 170, 225] },
    6: { scores: [9, 18, 22, 23, 17], timestamps: [11, 46, 98, 158, 212] },
    7: { scores: [9, 18, 22, 23, 18], timestamps: [14, 49, 102, 162, 218] },
    8: { scores: [8, 19, 23, 24, 18], timestamps: [20, 58, 115, 175, 230] },
  },

  evidenceText: {
    0: {
      excellent: '清晰介绍身份，主动核对患者姓名/年龄等信息。详细说明检查目的、操作步骤及可能的轻微不适感，充分取得患者知情配合。',
      pass: '能介绍自己并说明检查流程，但部分步骤解释略显简略，未详细说明每步目的。患者沟通基本完整。',
      fail: '未充分介绍自己或检查流程，患者信息核对不完整，缺乏对不适感的告知。',
    },
    1: {
      excellent: '正确指导患者体位，准确选择4/5趾间等阳性率高的取材部位。使用75%酒精规范消毒，刮取皮损边缘活动性皮屑，操作轻柔、取材充分，标本量适当。',
      pass: '能选择合理取材部位并完成采集，但消毒步骤或取材部位说明不够明确，取材量稍有不足或操作略显粗糙。',
      fail: '取材部位选择不当或操作不规范，消毒步骤缺失，取材量明显不足，影响后续检验结果。',
    },
    2: {
      excellent: '标本量控制适当，滴加10%氢氧化钾溶液后规范盖上盖玻片。酒精灯微加热火焰快速通过2-3次，手法娴熟。用滤纸轻压盖玻片吸去多余液体，标本均匀透明。',
      pass: '制片步骤基本正确，但微加热操作次数或力度稍有偏差，标本透明化程度一般，盖玻片下可能有少量气泡。',
      fail: '制片操作不规范，溶液量控制不当或未进行微加热。标本透明化不足，严重影响镜下观察。',
    },
    3: {
      excellent: '先低倍镜暗视野系统扫描，再切换高倍镜详细观察菌丝和孢子形态。调焦准确，视野转换流畅，能准确识别并描述菌丝和孢子的形态特征。',
      pass: '观察顺序正确（低倍→高倍），能识别菌丝和孢子的存在，但对形态特征的描述不够详细，调焦过程稍显迟滞。',
      fail: '观察顺序不当或未能正确识别菌丝和孢子。显微镜操作不熟练，无法有效完成观察。',
    },
    4: {
      excellent: '准确解释阳性结果（可诊断真菌感染但无法确定菌种）和阴性结果（不能排除真菌感染）的临床意义。强调需结合临床表现综合诊断，逻辑清晰、表达完整。',
      pass: '能基本解释阳性和阴性结果的意义，但对结合临床表现综合诊断的重要性强调不够，部分表述可进一步细化。',
      fail: '对镜检结果的临床意义解释不清或有误，未提及需结合临床进行综合判断。',
    },
  },

  getLevel: (score: number, maxScore: number) => {
    const pct = score / maxScore;
    return pct >= 0.85 ? 'excellent' : pct >= 0.6 ? 'pass' : 'fail';
  },

  aiSuggestionGen: (studentName, total, weakDims, evalData) => {
    const grade = total >= 90 ? '优秀' : total >= 80 ? '良好' : total >= 70 ? '合格' : '需加强';
    let text = `本次真菌镜检操作表现${grade}，${studentName}同学总分${total}/100分。`;

    if (weakDims.length > 0) {
      const w = weakDims[0];
      const ts = evalData?.timestamps[w.idx];
      text += `\n\n在「${w.label}」方面存在提升空间（${w.score}/${w.maxScore}分），`;
      if (ts) text += `视频 ${fmtTime(ts)} 处可观察到操作细节需改进。`;
      text += `建议加强该环节的标准化训练，注意操作要点的规范执行。`;
    }

    text += `\n\n建议后续训练重点：`;
    text += `①反复观看标准操作视频，对照自身操作找出差距；`;
    text += `②在模拟环境中进行至少3次完整流程练习；`;
    text += `③请带教老师重点指导薄弱环节的操作要领。`;

    return text;
  },
};
