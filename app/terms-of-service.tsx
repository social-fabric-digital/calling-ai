import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TERMS_EN = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By downloading, installing, or using the Calling app ("App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.',
  },
  {
    heading: '2. Description of Service',
    body: 'Calling is a personal growth and goal-setting app that provides daily reflections, astrological insights, and tools to help you discover your life purpose.',
  },
  {
    heading: '3. Subscriptions',
    bullets: [
      'Some features require a paid subscription',
      'Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period',
      'Payment is charged to your Apple ID account at confirmation of purchase',
      'You can manage and cancel subscriptions in your Apple ID account settings',
    ],
  },
  {
    heading: '4. User Accounts',
    bullets: [
      'You are responsible for maintaining the confidentiality of your account',
      'You must provide accurate information when creating an account',
    ],
  },
  {
    heading: '5. Age Requirement',
    body: 'This App is designed for users aged 16 and older. We do not target, market to, or knowingly collect personal information from anyone under the age of 16. Since the App collects your date of birth for astrological purposes, we use this information to verify that you meet the minimum age requirement. If we determine that a user is under 16, we will promptly delete their account and associated data.',
  },
  {
    heading: '6. User Content',
    bullets: [
      'You retain ownership of any content you create (goals, reflections, etc.)',
      'We do not share your personal data with third parties',
    ],
  },
  {
    heading: '7. Prohibited Uses',
    body: 'You agree not to:',
    bullets: [
      'Use the App for any unlawful purpose',
      'Attempt to hack, reverse engineer, or disrupt the App',
      'Impersonate others or provide false information',
    ],
  },
  {
    heading: '8. Not a Mental Health Service',
    body: 'This App is for personal reflection, goal-setting, and entertainment purposes only. It is NOT a substitute for professional mental health care, therapy, counseling, or medical advice.\n\nWe are not licensed mental health professionals, therapists, counselors, or medical providers. The content, features, and astrological insights in this App should not be used to diagnose, treat, or address any mental health condition.\n\nIf you are experiencing a mental health crisis, feeling unsafe, or struggling emotionally, please seek help immediately from a qualified professional. Resources include:',
    bullets: [
      'Your local emergency services (911 in the US)',
      'National Suicide Prevention Lifeline: 988 (US)',
      'Crisis Text Line: Text HOME to 741741 (US)',
      'A licensed therapist or counselor',
    ],
    footer: 'By using this App, you acknowledge that you are solely responsible for your own mental health and well-being. We strongly encourage you to seek professional support if you are going through a difficult time.',
  },
  {
    heading: '9. Disclaimer of Warranties',
    body: 'The App is provided "as is" without warranties of any kind. Astrological insights are for entertainment and reflection purposes only and should not be relied upon for making important life decisions.',
  },
  {
    heading: '10. Limitation of Liability',
    body: 'To the maximum extent permitted by law, we (the developers and operators of Calling) are not liable for any direct, indirect, incidental, consequential, or punitive damages arising from:',
    bullets: [
      'Your use of or inability to use the App',
      'Any decisions you make based on content in the App',
      'Your mental, emotional, or physical well-being',
      'Any actions you take or do not take as a result of using the App',
    ],
    footer: 'You use this App at your own risk and assume full responsibility for any outcomes.',
  },
  {
    heading: '11. Changes to Terms',
    body: 'We may update these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms.',
  },
  {
    heading: '12. Contact',
    body: 'For questions about these Terms, contact us at:',
    email: 'support@socialfabricdigital.com',
  },
];

const TERMS_RU = [
  {
    heading: '1. Принятие условий',
    body: 'Загружая, устанавливая или используя приложение Calling («Приложение»), вы соглашаетесь соблюдать настоящие Условия использования. Если вы не согласны с данными условиями, пожалуйста, не используйте Приложение.',
  },
  {
    heading: '2. Описание сервиса',
    body: 'Calling — это приложение для личностного роста и постановки целей, которое предоставляет ежедневные размышления, астрологические инсайты и инструменты для поиска вашего жизненного предназначения.',
  },
  {
    heading: '3. Подписки',
    bullets: [
      'Некоторые функции доступны только по платной подписке',
      'Подписка продлевается автоматически, если она не отменена как минимум за 24 часа до окончания текущего периода',
      'Оплата списывается с вашего Apple ID при подтверждении покупки',
      'Управлять подпиской и отменить её можно в настройках вашего Apple ID',
    ],
  },
  {
    heading: '4. Учётные записи пользователей',
    bullets: [
      'Вы несёте ответственность за сохранение конфиденциальности вашей учётной записи',
      'При создании учётной записи необходимо указывать достоверную информацию',
    ],
  },
  {
    heading: '5. Возрастные ограничения',
    body: 'Приложение предназначено для пользователей в возрасте от 16 лет и старше. Мы не ориентируемся на лиц младше 16 лет и сознательно не собираем их персональные данные. Поскольку Приложение запрашивает дату вашего рождения для астрологических расчётов, мы используем эту информацию для проверки соответствия минимальному возрастному требованию. Если мы установим, что пользователю меньше 16 лет, мы незамедлительно удалим его учётную запись и все связанные с ней данные.',
  },
  {
    heading: '6. Пользовательский контент',
    bullets: [
      'Вы сохраняете право собственности на любой контент, который создаёте (цели, размышления и т.д.)',
      'Мы не передаём ваши персональные данные третьим лицам',
    ],
  },
  {
    heading: '7. Запрещённое использование',
    body: 'Вы обязуетесь не:',
    bullets: [
      'Использовать Приложение в незаконных целях',
      'Пытаться взломать, провести обратную разработку или нарушить работу Приложения',
      'Выдавать себя за других лиц или предоставлять ложную информацию',
    ],
  },
  {
    heading: '8. Приложение не является службой психологической помощи',
    body: 'Данное Приложение предназначено исключительно для личных размышлений, постановки целей и развлечения. Оно НЕ является заменой профессиональной психологической помощи, психотерапии, консультирования или медицинских рекомендаций.\n\nМы не являемся лицензированными специалистами в области психического здоровья, психотерапевтами, консультантами или медицинскими работниками. Контент, функции и астрологические инсайты в этом Приложении не должны использоваться для диагностики, лечения или решения каких-либо проблем с психическим здоровьем.\n\nЕсли вы переживаете кризис психического здоровья, чувствуете себя в опасности или испытываете эмоциональные трудности, пожалуйста, немедленно обратитесь за помощью к квалифицированному специалисту. Вот некоторые ресурсы:',
    bullets: [
      'Телефон доверия: 8-800-2000-122 (Россия, бесплатно)',
      'Психологическая помощь: 051 (с мобильного) или 8-495-051 (Москва)',
      'Служба экстренной психологической помощи в вашем регионе',
      'Лицензированный психолог или психотерапевт',
    ],
    footer: 'Используя это Приложение, вы признаёте, что несёте полную ответственность за своё психическое здоровье и благополучие. Мы настоятельно рекомендуем обращаться за профессиональной поддержкой, если вы переживаете трудный период.',
  },
  {
    heading: '9. Отказ от гарантий',
    body: 'Приложение предоставляется «как есть» без каких-либо гарантий. Астрологические инсайты предназначены исключительно для развлечения и размышлений и не должны использоваться для принятия важных жизненных решений.',
  },
  {
    heading: '10. Ограничение ответственности',
    body: 'В максимальной степени, допускаемой законодательством, мы (разработчики и операторы Calling) не несём ответственности за любой прямой, косвенный, случайный, последующий или штрафной ущерб, возникший в результате:',
    bullets: [
      'Использования вами Приложения или невозможности его использования',
      'Любых решений, принятых вами на основе контента Приложения',
      'Вашего психического, эмоционального или физического состояния',
      'Любых действий или бездействия с вашей стороны в результате использования Приложения',
    ],
    footer: 'Вы используете это Приложение на свой страх и риск и принимаете на себя полную ответственность за любые последствия.',
  },
  {
    heading: '11. Изменение условий',
    body: 'Мы можем обновить настоящие Условия в любое время. Продолжение использования Приложения после внесения изменений означает ваше согласие с новыми Условиями.',
  },
  {
    heading: '12. Контакты',
    body: 'По вопросам, связанным с настоящими Условиями, обращайтесь по адресу:',
    email: 'support@socialfabricdigital.com',
  },
];

type Section = {
  heading: string;
  body?: string;
  bullets?: string[];
  email?: string;
  footer?: string;
};

export default function TermsOfServiceScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isRussian = i18n.language?.startsWith('ru');
  const sections: Section[] = isRussian ? TERMS_RU : TERMS_EN;
  const lastUpdated = isRussian
    ? 'Дата последнего обновления: 24 февраля 2026 г.'
    : 'Last updated: February 24, 2026';
  const title = isRussian ? 'Условия использования' : 'Terms of Service';

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
          {isRussian ? 'Условия использования приложения Calling' : 'Terms of Service for Calling'}
        </Text>
        <Text style={styles.lastUpdated}>{lastUpdated}</Text>

        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
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
    fontSize: 18,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  appName: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 6,
    textTransform: 'none',
  },
  lastUpdated: {
    ...BodyStyle,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 28,
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
