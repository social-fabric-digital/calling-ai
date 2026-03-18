import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Section = {
  heading: string;
  isSubsection?: boolean;
  body?: string;
  bullets?: string[];
  footer?: string;
  email?: string;
};

const PRIVACY_EN: Section[] = [
  {
    heading: '1. Introduction',
    body: 'Welcome to Calling ("we," "our," or "us"). We are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application Calling (the "App").\n\nPlease read this Privacy Policy carefully. By accessing or using the App, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, please do not use the App.\n\nWe may update this Privacy Policy at any time. Updates are reflected in the "Last Updated" date. We will notify you of material changes through in-app notices or email.',
  },
  {
    heading: '2. Information We Collect',
  },
  {
    heading: '2.1 Personal Information You Provide',
    isSubsection: true,
    bullets: [
      'Email Address – Account creation, authentication, and communication',
      'Name – Personalization of your experience',
      'Date of Birth – Astrological calculations and personalized insights',
      'Time of Birth – Accurate birth chart generation',
      'Place of Birth – Astrological calculations',
      'Goals and Aspirations – Goal tracking and AI coaching',
      'Personal Reflections – Clarity Map and journaling features',
      'Chat Conversations – AI coaching interactions with Atlas',
    ],
  },
  {
    heading: '2.2 Information Collected Automatically',
    isSubsection: true,
    bullets: [
      'Device Information: Device type, operating system, unique device identifiers',
      'Usage Data: Features used, time spent in app, interaction patterns',
      'Log Data: Access times, pages viewed, app crashes, and system activity',
      'Location Data: General location based on IP address only — no precise GPS',
    ],
  },
  {
    heading: '3. How We Use Your Information',
  },
  {
    heading: '3.1 Core App Functionality',
    isSubsection: true,
    bullets: [
      'Generate personalized astrological insights based on your birth data',
      'Provide AI-powered life coaching through Atlas',
      'Track and manage your goals and milestones',
      'Deliver daily personalized cosmic insights',
      'Power the Clarity Map and reflection features',
    ],
  },
  {
    heading: '3.2 Personalization',
    isSubsection: true,
    bullets: [
      'Customize content and recommendations to your unique profile',
      'Tailor the AI coaching experience to your needs and goals',
      'Provide relevant notifications and reminders',
    ],
  },
  {
    heading: '3.3 Communication',
    isSubsection: true,
    bullets: [
      'Send you updates about your goals and progress',
      'Deliver daily insight notifications (with your permission)',
      'Respond to your inquiries and support requests',
      'Send important service-related announcements',
    ],
  },
  {
    heading: '3.4 Improvement and Analytics',
    isSubsection: true,
    bullets: [
      'Understand how users interact with the App',
      'Identify and fix bugs and technical issues',
      'Develop new features and improve existing ones',
      'Conduct research and analysis to enhance user experience',
    ],
  },
  {
    heading: '3.5 Legal and Safety',
    isSubsection: true,
    bullets: [
      'Comply with legal obligations',
      'Enforce our Terms of Service',
      'Protect against fraudulent or illegal activity',
      'Ensure the security of our services',
    ],
  },
  {
    heading: '4. How We Share Your Information',
    body: 'We do not sell, trade, or rent your personal information to third parties.',
  },
  {
    heading: '5. Data Storage and Security',
  },
  {
    heading: '5.1 Where We Store Your Data',
    isSubsection: true,
    body: 'Your data is stored securely on servers provided by Supabase, located in the United States. If additional server locations are used in the future, this policy will be updated accordingly.',
  },
  {
    heading: '5.2 How We Protect Your Data',
    isSubsection: true,
    bullets: [
      'Encryption of data in transit (TLS/SSL)',
      'Encryption of sensitive data at rest',
      'Secure authentication mechanisms and access controls',
      'Regular security assessments and code review',
    ],
  },
  {
    heading: '5.3 Data Retention',
    isSubsection: true,
    body: 'We retain your personal information for as long as your account is active or as needed to provide services. After account deletion, we will delete your personal data within 30 days, except for data we are legally required to retain.',
  },
  {
    heading: '6. Your Rights and Choices',
    bullets: [
      'Access and Portability – Request a copy of your personal data',
      'Correction – Request correction of inaccurate data',
      'Deletion – Request deletion of your account and data through the Settings screen',
      'Opt-Out – Manage notification preferences in the App or device settings',
    ],
  },
  {
    heading: '7. Age Requirement',
    body: 'This App is designed for users aged 16 and older. We do not target, market to, or knowingly collect personal information from anyone under the age of 16. Since the App collects your date of birth for astrological purposes, we use this to verify you meet the minimum age requirement. If we determine a user is under 16, we will promptly delete their account and associated data.',
  },
  {
    heading: '8. International Data Transfers',
    body: 'If you are accessing the App from outside the United States, your information will be transferred to, stored, and processed in the United States. For users in the EEA, UK, or Switzerland, we rely on Standard Contractual Clauses as the legal mechanism for transferring your data.',
  },
  {
    heading: '9. Third-Party Links and Services',
    body: 'The App may contain links to third-party websites or services that are not operated by us. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.',
  },
  {
    heading: '10. California Privacy Rights (CCPA)',
    body: 'If you are a California resident, you have additional rights under the CCPA:',
    bullets: [
      'Right to Know – Request information about the data we have collected about you',
      'Right to Delete – Request deletion of your personal information',
      'Right to Opt-Out – We do not sell your personal information',
      'Right to Non-Discrimination – We will not discriminate against you for exercising your rights',
    ],
  },
  {
    heading: '11. European Privacy Rights (GDPR)',
    body: 'If you are located in the EEA, UK, or Switzerland, you have additional rights under the GDPR, including the right to access, rectify, erase, restrict, and port your data, and to object to processing. For GDPR-related inquiries, contact us at:',
    email: 'privacy@callingai.app',
    footer: 'We aim to respond to all GDPR requests within 30 days.',
  },
  {
    heading: '12. Changes to This Privacy Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of material changes at least 30 days in advance through a prominent notice in the App and an email to your registered address. Your continued use of the App after changes take effect indicates your acceptance.',
  },
  {
    heading: '13. Contact',
    body: 'For questions about this Privacy Policy, contact us at:',
    email: 'support@socialfabricdigital.com',
  },
];

const PRIVACY_RU: Section[] = [
  {
    heading: '1. Введение',
    body: 'Добро пожаловать в Calling («мы», «наш» или «нас»). Мы стремимся защищать вашу конфиденциальность и персональные данные. Эта политика конфиденциальности объясняет, как мы собираем, используем, раскрываем и защищаем информацию при использовании мобильного приложения Calling («Приложение»).\n\nПожалуйста, внимательно прочитайте эту политику. Используя Приложение, вы подтверждаете своё согласие с её условиями. Если вы не согласны — пожалуйста, не используйте Приложение.\n\nМы можем обновлять политику в любое время. О существенных изменениях мы сообщим через уведомления в приложении или по электронной почте.',
  },
  {
    heading: '2. Информация, которую мы собираем',
  },
  {
    heading: '2.1 Информация, которую вы предоставляете',
    isSubsection: true,
    bullets: [
      'Адрес электронной почты – создание учётной записи и связь',
      'Имя – персонализация пользовательского опыта',
      'Дата рождения – астрологические расчёты и персонализированные прогнозы',
      'Время рождения – построение точной натальной карты',
      'Место рождения – астрологические расчёты',
      'Цели и стремления – отслеживание целей и AI-коучинг',
      'Личные размышления – записи в дневнике и карте ясности',
      'Переписки в чате – взаимодействие с AI-коучем Atlas',
    ],
  },
  {
    heading: '2.2 Информация, собираемая автоматически',
    isSubsection: true,
    bullets: [
      'Сведения об устройстве: тип, операционная система, идентификаторы',
      'Данные об использовании: используемые функции, время в приложении',
      'Данные журнала: время доступа, просмотренные страницы, сбои приложения',
      'Данные о местоположении: общее местоположение по IP-адресу, без точного GPS',
    ],
  },
  {
    heading: '3. Как мы используем вашу информацию',
    bullets: [
      'Создание персонализированных астрологических прогнозов',
      'Предоставление AI-коучинга через Atlas',
      'Отслеживание и управление целями и этапами',
      'Доставка ежедневных персонализированных прогнозов',
      'Работа функций карты ясности и рефлексии',
      'Улучшение и развитие функций приложения',
      'Соблюдение правовых обязательств и обеспечение безопасности',
    ],
  },
  {
    heading: '4. Передача информации третьим лицам',
    body: 'Мы не продаём, не обмениваем и не сдаём в аренду вашу личную информацию третьим лицам.',
  },
  {
    heading: '5. Хранение и безопасность данных',
    bullets: [
      'Шифрование данных при передаче (TLS/SSL)',
      'Шифрование конфиденциальных данных при хранении',
      'Безопасные механизмы аутентификации и контроль доступа',
      'Регулярные оценки безопасности и проверка кода',
    ],
    footer: 'После удаления учётной записи мы удалим ваши данные в течение 30 дней, за исключением данных, которые требуется хранить по закону.',
  },
  {
    heading: '6. Ваши права',
    bullets: [
      'Доступ к данным и переносимость',
      'Исправление неточных данных',
      'Удаление данных через экран настроек',
      'Управление уведомлениями и отказ от рассылок',
    ],
  },
  {
    heading: '7. Возрастные ограничения',
    body: 'Приложение предназначено для пользователей в возрасте от 16 лет и старше. Мы не собираем персональные данные лиц младше 16 лет. Если мы установим, что пользователю меньше 16 лет, мы незамедлительно удалим его учётную запись и все связанные данные.',
  },
  {
    heading: '8. Международная передача данных',
    body: 'Если вы используете Приложение за пределами США, ваша информация может передаваться и обрабатываться в Соединённых Штатах Америки. Для пользователей из ЕЭЗ, Великобритании и Швейцарии мы опираемся на Стандартные договорные положения.',
  },
  {
    heading: '9. Ссылки и сервисы третьих лиц',
    body: 'Мы не несём ответственности за политику конфиденциальности сторонних сервисов. Пожалуйста, ознакомьтесь с их условиями до передачи личной информации.',
  },
  {
    heading: '10. Права в соответствии с GDPR',
    body: 'Если вы находитесь в ЕЭЗ, Великобритании или Швейцарии, у вас есть дополнительные права в соответствии с GDPR: право на доступ, исправление, удаление, ограничение обработки и перенос данных. По вопросам, связанным с GDPR, обращайтесь по адресу:',
    email: 'privacy@callingai.app',
    footer: 'Мы стараемся отвечать на такие запросы в течение 30 дней.',
  },
  {
    heading: '11. Изменения политики конфиденциальности',
    body: 'Мы можем периодически обновлять эту политику. О существенных изменениях мы уведомим вас не менее чем за 30 дней через уведомление в приложении и по электронной почте.',
  },
  {
    heading: '12. Контакты',
    body: 'По вопросам, связанным с настоящей политикой конфиденциальности, обращайтесь по адресу:',
    email: 'support@socialfabricdigital.com',
  },
];

export default function PrivacyPolicyScreen() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isRussian = i18n.language?.startsWith('ru');
  const sections: Section[] = isRussian ? PRIVACY_RU : PRIVACY_EN;
  const lastUpdated = isRussian
    ? 'Дата последнего обновления: 15 февраля 2026 г.'
    : 'Last Updated: February 15, 2026';
  const title = isRussian ? 'Политика конфиденциальности' : 'Privacy Policy';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>
          {isRussian ? 'Политика конфиденциальности приложения Calling' : 'Privacy Policy for Calling'}
        </Text>
        <Text style={styles.lastUpdated}>{lastUpdated}</Text>

        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={section.isSubsection ? styles.subheading : styles.sectionHeading}>
              {section.heading}
            </Text>
            {section.body ? (
              <Text style={styles.sectionBody}>
                {section.body}
                {section.email ? (
                  <Text
                    style={styles.emailLink}
                    onPress={() => Linking.openURL(`mailto:${section.email}`)}
                  >{' '}{section.email}</Text>
                ) : null}
              </Text>
            ) : null}
            {!section.body && section.email ? (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${section.email}`)}>
                <Text style={styles.emailLink}>{section.email}</Text>
              </TouchableOpacity>
            ) : null}
            {section.bullets ? (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet, bi) => (
                  <View key={bi} style={styles.bulletRow}>
                    <Text style={styles.bullet}>{'•'}</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {section.footer ? (
              <Text style={styles.sectionBody}>{section.footer}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#342846',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#342846',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  appName: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  lastUpdated: {
    ...BodyStyle,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    ...BodyStyle,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  subheading: {
    ...BodyStyle,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  sectionBody: {
    ...BodyStyle,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletList: {
    marginTop: 4,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    ...BodyStyle,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginRight: 10,
    lineHeight: 22,
  },
  bulletText: {
    ...BodyStyle,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    flex: 1,
  },
  emailLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
  },
});
