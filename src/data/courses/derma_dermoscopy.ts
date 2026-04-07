import type { CourseConfig } from '@/types';
import { fmtTime } from '@/utils/format';

export const dermaDermoscopy: CourseConfig = {
  id: 'derma_dermoscopy',
  name: '皮肤镜检查',
  shortName: '皮肤镜',
  videoSrc: '/videos/derma_dermoscopy.mp4',

  rubric: [
    { key: 'deviceSetup', label: '皮肤镜设备操作', maxScore: 15 },
    { key: 'contactTech', label: '接触/非接触技术选择', maxScore: 20 },
    { key: 'systematicScan', label: '系统性扫查方法', maxScore: 25 },
    { key: 'structureId', label: '皮肤镜特征识别', maxScore: 25 },
    { key: 'reportComm', label: '报告阐述与诊断建议', maxScore: 15 },
  ],

  evals: {
    1: { scores: [13, 17, 21, 21, 13], timestamps: [6, 35, 85, 165, 250] },
    2: { scores: [11, 15, 19, 18, 11], timestamps: [8, 38, 90, 170, 255] },
    3: { scores: [9, 13, 16, 15, 9], timestamps: [12, 42, 95, 178, 262] },
    4: { scores: [14, 19, 23, 23, 14], timestamps: [4, 30, 78, 158, 242] },
    5: { scores: [8, 11, 13, 12, 7], timestamps: [15, 48, 102, 185, 270] },
    6: { scores: [12, 16, 20, 19, 12], timestamps: [7, 36, 87, 167, 252] },
    7: { scores: [10, 14, 17, 16, 10], timestamps: [10, 40, 92, 175, 258] },
    8: { scores: [7, 10, 12, 11, 6], timestamps: [18, 52, 108, 192, 278] },
  },

  evidenceText: {
    0: {
      excellent: '正确开启偏振光模式，镜头清洁到位，接触式检查时藕合剂涂布均匀适量。设备参数设置准确。',
      pass: '能正常使用皮肤镜设备，但参数设置或镜头清洁略有疏忽。',
      fail: '设备模式选择错误，镜头未清洁影响图像质量，或藕合剂使用不当。',
    },
    1: {
      excellent: '根据皮损类型准确选择接触/非接触方式并能清晰说明理由。对破溃/出血皮损使用非接触偏振模式，色素皮损使用接触式超声耦合剂。',
      pass: '技术选择基本正确，但对选择理由的解释不够充分。',
      fail: '在有破溃皮损上使用接触式检查，或技术选择明显不当。',
    },
    2: {
      excellent: '先低倍概览皮损边界和整体形态，再放大聚焦从中心向边缘系统扫查。拍摄包含完整边界的标准化影像。',
      pass: '扫查基本完成，但遗漏部分边缘区域或影像拍摄不够标准化。',
      fail: '仅扫查中央区域，未覆盖边界特征，影像质量差。',
    },
    3: {
      excellent: '系统描述颜色分布（多色/单色）、边界规则性、色素网络/球/点特征、血管模式和结构特征（白色条纹/退行区等），使用标准皮肤镜术语。',
      pass: '能识别主要特征，但描述不够系统或遗漏部分重要结构。',
      fail: '无法识别皮肤镜基本特征，术语使用不规范。',
    },
    4: {
      excellent: '按照两步法/ABCD法则逻辑清晰地汇报，初步诊断依据充分，随访或手术建议合理且有据可依。',
      pass: '汇报基本完整但逻辑结构略显欠缺，诊断建议缺乏充分论述。',
      fail: '无法组织有效汇报，诊断建议不当或缺乏依据。',
    },
  },

  getLevel: (score: number, maxScore: number) => {
    const pct = score / maxScore;
    return pct >= 0.85 ? 'excellent' : pct >= 0.6 ? 'pass' : 'fail';
  },

  aiSuggestionGen: (studentName, total, weakDims, evalData) => {
    const grade = total >= 90 ? '优秀' : total >= 80 ? '良好' : total >= 70 ? '合格' : '需加强';
    let text = `本次皮肤镜检查操作表现${grade}，${studentName}同学总分${total}/100分。`;

    if (weakDims.length > 0) {
      const w = weakDims[0];
      const ts = evalData?.timestamps[w.idx];
      text += `\n\n在「${w.label}」方面存在提升空间（${w.score}/${w.maxScore}分），`;
      if (ts) text += `视频 ${fmtTime(ts)} 处可观察到操作细节需改进。`;
      text += `建议加强皮肤镜特征识别和标准化汇报的训练。`;
    }

    text += `\n\n建议后续训练重点：`;
    text += `①系统学习皮肤镜特征图谱，掌握常见模式识别；`;
    text += `②按照两步法/ABCD法则进行标准化汇报练习；`;
    text += `③在临床实践中积累不同类型皮损的皮肤镜经验。`;

    return text;
  },
};
