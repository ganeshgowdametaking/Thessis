import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/theme';
import { supabase } from '../lib/supabase';

export const LoginScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAuth = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (activeTab === 'signin') {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email: email.trim().toLowerCase(),
                    password,
                });
                if (error) throw error;
                console.log('Login successful:', data);
                navigation.replace('Main');
            } else {
                const { error, data } = await supabase.auth.signUp({
                    email: email.trim().toLowerCase(),
                    password,
                });
                if (error) throw error;
                console.log('Signup successful:', data);
                setError('Verification email sent! Please check your inbox.');
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async () => {
        setLoading(true);
        setError('Starting granular tests...');
        let results = '';

        try {
            const res1 = await fetch('https://www.google.com');
            results += `Google: ${res1.status} | `;
            setError(results);
        } catch (e: any) {
            results += `Google: FAILED (${e.message}) | `;
            setError(results);
        }

        try {
            const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
            const res2 = await fetch(supabaseUrl);
            results += `Supabase: ${res2.status} | `;
            setError(results);
        } catch (e: any) {
            results += `Supabase: FAILED (${e.message}) | `;
            setError(results);
        }

        try {
            const res3 = await fetch('https://httpbin.org/get');
            results += `GET (httpbin): ${res3.status} | `;
            setError(results);
        } catch (e: any) {
            results += `GET (httpbin): FAILED (${e.message}) | `;
            setError(results);
        }

        try {
            const res4 = await fetch('https://httpbin.org/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: true })
            });
            results += `POST: ${res4.status}`;
            setError(results);
        } catch (e: any) {
            results += `POST: FAILED (${e.message})`;
            setError(results);
        }

        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="water" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.brandName}>Thessis</Text>
                    <Text style={styles.tagline}>Navigate your career with confidence</Text>

                    <TouchableOpacity
                        onPress={testConnection}
                        style={{ marginTop: 10, padding: 8, backgroundColor: COLORS.surfaceDeep, borderRadius: 8 }}
                    >
                        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Test Connection</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
                        onPress={() => setActiveTab('signin')}
                    >
                        <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                        onPress={() => setActiveTab('signup')}
                    >
                        <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>Sign Up</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="********"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.authButton}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.authButtonText}>
                                {activeTab === 'signin' ? 'Sign In to Thessis' : 'Create Account'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialRow}>
                        <TouchableOpacity style={styles.socialButton}>
                            <Ionicons name="logo-google" size={24} color="#DB4437" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialButton}>
                            <Ionicons name="logo-linkedin" size={24} color="#0077B5" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingTop: 80,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    brandName: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.textMain,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: 4,
        marginBottom: SPACING.xl,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: RADIUS.sm,
    },
    activeTab: {
        backgroundColor: COLORS.white,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    activeTabText: {
        color: COLORS.textMain,
    },
    form: {
        gap: SPACING.md,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMain,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    inputIcon: {
        marginLeft: SPACING.md,
    },
    input: {
        flex: 1,
        padding: SPACING.md,
        fontSize: 16,
        color: COLORS.textMain,
    },
    authButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    authButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.borderLight,
    },
    dividerText: {
        paddingHorizontal: SPACING.md,
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    socialRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        justifyContent: 'center',
    },
    socialButton: {
        width: 60,
        height: 60,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
});
