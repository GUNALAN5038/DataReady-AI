import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/colors'
import { Header } from '../../components/Header'
import { fetchConversations, fetchMessages, sendChatMessage, createConversation } from '../../services/chat'
import { fetchDatasetById } from '../../services/datasets'
import type { ChatMessage, ChatConversation } from '../../types/chat'
import type { Dataset } from '../../types/datasets'
import { Ionicons } from '@expo/vector-icons'

export default function DatasetChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const flatListRef = useRef<FlatList>(null)

  const loadData = useCallback(async () => {
    if (!id) return

    try {
      const [datasetRes, convsRes] = await Promise.all([
        fetchDatasetById(id),
        fetchConversations(id),
      ])

      if (datasetRes.dataset) setDataset(datasetRes.dataset)

      if (convsRes.conversations && convsRes.conversations.length > 0) {
        setConversation(convsRes.conversations[0])
        const msgsRes = await fetchMessages(convsRes.conversations[0].id)
        setMessages(msgsRes.messages || [])
      } else {
        // Create initial conversation for this dataset
        const title = `Analysis: ${datasetRes.dataset?.name || 'Dataset'}`
        const newConv = await createConversation(title, id)
        if (newConv.conversation) {
          setConversation(newConv.conversation)
          setMessages([])
        }
      }
    } catch {
      // Ignore
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || isSending) return

    setErrorMessage(null)
    setInputText('')

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation?.id || 'new',
      user_id: 'user',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    const tempAssistantMsg: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      conversation_id: conversation?.id || 'new',
      user_id: 'assistant',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg])
    setIsSending(true)

    const apiMessages: { role: 'user' | 'assistant'; content: string }[] = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    apiMessages.push({ role: 'user', content: text })

    const res = await sendChatMessage({
      messages: apiMessages,
      datasetId: id,
      conversationId: conversation?.id,
      onChunk: accumulatedText => {
        setMessages(prev => {
          const next = [...prev]
          const lastIndex = next.length - 1
          if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
            next[lastIndex] = { ...next[lastIndex], content: accumulatedText }
          }
          return next
        })
      },
    })

    setIsSending(false)

    if (res.error) {
      setErrorMessage(res.error)
      setMessages(prev => prev.filter(m => m.id !== tempAssistantMsg.id))
    }
  }

  const suggestedQuestions = [
    'How should I clean missing values in this dataset?',
    'What features might cause data leakage?',
    'Are there significant outliers in numerical columns?',
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={`AI Chat: ${dataset?.name || 'Dataset'}`} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBadge}>
                <Ionicons name="sparkles" size={26} color={Colors.primary.blue} />
              </View>
              <Text style={styles.emptyTitle}>Chat with {dataset?.name}</Text>
              <Text style={styles.emptySubtitle}>
                Ask Gemini questions tailored to this dataset&apos;s statistical properties and machine learning readiness.
              </Text>
              <View style={styles.suggestedContainer}>
                {suggestedQuestions.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestedChip}
                    onPress={() => handleSend(q)}
                  >
                    <Text style={styles.suggestedChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isUser = item.role === 'user'
            return (
              <View
                style={[
                  styles.messageBubbleContainer,
                  isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer,
                ]}
              >
                {!isUser && (
                  <View style={styles.assistantAvatar}>
                    <Ionicons name="sparkles" size={14} color={Colors.neutral.white} />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userMessageText : styles.assistantMessageText,
                    ]}
                  >
                    {item.content || (isSending ? 'Generating response...' : '')}
                  </Text>
                </View>
              </View>
            )
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            placeholder={`Ask about ${dataset?.name || 'this dataset'}...`}
            placeholderTextColor={Colors.neutral[400]}
            value={inputText}
            onChangeText={setInputText}
            style={styles.chatInput}
            multiline
            maxLength={1000}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.neutral.white} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={Colors.neutral.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorBg,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.status.errorText,
    fontWeight: '500',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  emptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  suggestedContainer: {
    width: '100%',
    gap: 8,
  },
  suggestedChip: {
    backgroundColor: Colors.neutral.white,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  suggestedChipText: {
    fontSize: 13,
    color: Colors.primary.blue,
    fontWeight: '500',
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  assistantBubbleContainer: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: Colors.primary.blue,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.neutral.white,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.neutral.white,
  },
  assistantMessageText: {
    color: Colors.neutral[900],
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    gap: 8,
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.neutral[50],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: Colors.neutral[900],
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
})
