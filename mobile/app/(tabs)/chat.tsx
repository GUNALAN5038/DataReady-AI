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
import { Colors } from '../../constants/colors'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { fetchConversations, fetchMessages, sendChatMessage, createConversation } from '../../services/chat'
import { fetchDatasets } from '../../services/datasets'
import type { ChatConversation, ChatMessage } from '../../types/chat'
import type { Dataset } from '../../types/datasets'
import { Ionicons } from '@expo/vector-icons'

export default function ChatScreen() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showConversationList, setShowConversationList] = useState(false)

  const flatListRef = useRef<FlatList>(null)

  const loadInitialData = useCallback(async () => {
    try {
      const [convsRes, datasetsRes] = await Promise.all([
        fetchConversations(),
        fetchDatasets(),
      ])

      setConversations(convsRes.conversations || [])
      setDatasets(datasetsRes.datasets || [])

      if (convsRes.conversations && convsRes.conversations.length > 0) {
        setActiveConversation(convsRes.conversations[0])
        loadMessages(convsRes.conversations[0].id)
      }
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const loadMessages = async (convId: string) => {
    const res = await fetchMessages(convId)
    setMessages(res.messages || [])
  }

  const handleSelectConversation = (conv: ChatConversation) => {
    setActiveConversation(conv)
    setSelectedDatasetId(conv.dataset_id || undefined)
    loadMessages(conv.id)
    setShowConversationList(false)
  }

  const handleNewConversation = async () => {
    const title = selectedDatasetId
      ? `Chat: ${datasets.find(d => d.id === selectedDatasetId)?.name || 'Dataset'}`
      : 'New AI Analysis'

    const res = await createConversation(title, selectedDatasetId)
    if (res.conversation) {
      setConversations([res.conversation, ...conversations])
      setActiveConversation(res.conversation)
      setMessages([])
      setShowConversationList(false)
    }
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || isSending) return

    setErrorMessage(null)
    setInputText('')

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversation?.id || 'new',
      user_id: 'user',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    const tempAssistantMsg: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      conversation_id: activeConversation?.id || 'new',
      user_id: 'assistant',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg])
    setIsSending(true)

    // Build payload messages
    const apiMessages: { role: 'user' | 'assistant'; content: string }[] = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    apiMessages.push({ role: 'user', content: text })

    const res = await sendChatMessage({
      messages: apiMessages,
      datasetId: selectedDatasetId,
      conversationId: activeConversation?.id,
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
      // Remove temporary assistant message if failed
      setMessages(prev => prev.filter(m => m.id !== tempAssistantMsg.id))
      return
    }

    if (res.conversationId && (!activeConversation || activeConversation.id !== res.conversationId)) {
      // Reload conversations to update title / active ID
      const updatedConvs = await fetchConversations()
      setConversations(updatedConvs.conversations || [])
      const matched = updatedConvs.conversations?.find(c => c.id === res.conversationId)
      if (matched) setActiveConversation(matched)
    }
  }

  const suggestedPrompts = [
    'Assess ML readiness of this dataset',
    'What features have the highest missing values?',
    'Identify potential outlier columns and remedies',
    'Recommend transformations for model training',
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity
              onPress={() => setShowConversationList(!showConversationList)}
              style={styles.convSelector}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeConversation?.title || 'DataReady AI Chat'}
              </Text>
              <Ionicons
                name={showConversationList ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.neutral[600]}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleNewConversation}
            style={styles.newChatButton}
            accessibilityRole="button"
            accessibilityLabel="New Chat"
          >
            <Ionicons name="create-outline" size={22} color={Colors.primary.blue} />
          </TouchableOpacity>
        </View>

        {/* Dataset Context Pill */}
        {selectedDatasetId && (
          <View style={styles.datasetContextBar}>
            <Ionicons name="document-text-outline" size={14} color={Colors.primary.blue} />
            <Text style={styles.datasetContextText} numberOfLines={1}>
              Active dataset: {datasets.find(d => d.id === selectedDatasetId)?.name || 'Selected'}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDatasetId(undefined)}>
              <Ionicons name="close-circle" size={16} color={Colors.neutral[400]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Conversation Switcher Drawer */}
        {showConversationList && (
          <View style={styles.convDrawer}>
            <View style={styles.convDrawerHeader}>
              <Text style={styles.convDrawerTitle}>Chat History</Text>
              <TouchableOpacity onPress={handleNewConversation}>
                <Text style={styles.newConvLink}>+ New Chat</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={conversations}
              keyExtractor={item => item.id}
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.convDrawerItem,
                    activeConversation?.id === item.id && styles.activeConvDrawerItem,
                  ]}
                  onPress={() => handleSelectConversation(item)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color={activeConversation?.id === item.id ? Colors.primary.blue : Colors.neutral[500]}
                  />
                  <Text
                    style={[
                      styles.convDrawerItemText,
                      activeConversation?.id === item.id && styles.activeConvDrawerItemText,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.status.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Chat Message Stream */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBadge}>
                <Ionicons name="sparkles" size={28} color={Colors.primary.blue} />
              </View>
              <Text style={styles.emptyTitle}>Ask DataReady AI</Text>
              <Text style={styles.emptySubtitle}>
                Get instant machine learning recommendations, outlier insights, and quality diagnostics.
              </Text>

              <View style={styles.suggestedPromptsContainer}>
                {suggestedPrompts.map((prompt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.promptChip}
                    onPress={() => handleSend(prompt)}
                  >
                    <Text style={styles.promptChipText}>{prompt}</Text>
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
                    {item.content || (isSending ? 'Thinking...' : '')}
                  </Text>
                </View>
              </View>
            )
          }}
        />

        {/* Message Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            placeholder="Ask a question about your data..."
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
            accessibilityRole="button"
            accessibilityLabel="Send message"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitleRow: {
    flex: 1,
    marginRight: 10,
  },
  convSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.neutral[900],
    maxWidth: 240,
  },
  newChatButton: {
    padding: 6,
  },
  datasetContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary[100],
  },
  datasetContextText: {
    fontSize: 12,
    color: Colors.primary.blueDark,
    fontWeight: '600',
    flex: 1,
  },
  convDrawer: {
    backgroundColor: Colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    padding: 12,
    elevation: 4,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  convDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  convDrawerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.neutral[700],
  },
  newConvLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary.blue,
  },
  convDrawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeConvDrawerItem: {
    backgroundColor: Colors.primary[50],
  },
  convDrawerItemText: {
    fontSize: 14,
    color: Colors.neutral[800],
    flex: 1,
  },
  activeConvDrawerItemText: {
    color: Colors.primary.blueDark,
    fontWeight: '600',
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
    paddingTop: 36,
    paddingHorizontal: 20,
  },
  emptyIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  suggestedPromptsContainer: {
    width: '100%',
    gap: 8,
  },
  promptChip: {
    backgroundColor: Colors.neutral.white,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  promptChipText: {
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
