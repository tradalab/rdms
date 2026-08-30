"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { Input } from "@tradalab/lyra/ui"
import { Textarea } from "@tradalab/lyra/ui"
import { ScrollArea } from "@tradalab/lyra/ui"
import { Separator } from "@tradalab/lyra/ui"
import { Switch } from "@tradalab/lyra/ui"
import { usePubSubStream, usePubSubPublish, usePubSubSubscribe, usePubSubUnsubscribe } from "@/hooks/api/pubsub.api"
import { Plus, Send, Trash2, Ban, Play, Pause, Radio } from "lucide-react"

interface PubsubMessage {
  channel: string
  message: string
  pattern?: string
  time: number
}

const MAX_MESSAGES = 1000

export function ConnectionDetailTabPubSub({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const [channels, setChannels] = useState<string[]>([])
  const [newChannelItem, setNewChannelItem] = useState("")
  const [messages, setMessages] = useState<PubsubMessage[]>([])
  const [publishMessage, setPublishMessage] = useState("")
  const [publishChannel, setPublishChannel] = useState("")

  const [autoScroll, setAutoScroll] = useState(true)
  const [isSubscribeAll, setIsSubscribeAll] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const subscribeMutation = usePubSubSubscribe()
  const unsubscribeMutation = usePubSubUnsubscribe()
  const publishMutation = usePubSubPublish()

  const subscribeChannel = useCallback(
    async (channel: string) => {
      if (!channel || channels.includes(channel)) return
      try {
        await subscribeMutation.mutateAsync({
          connection_id: connectionId,
          database_index: databaseIdx,
          channels: [channel],
        })
        setChannels(prev => [...prev, channel])
        setNewChannelItem("")
        setPublishChannel(channel)
      } catch (err) {
        console.error("Subscribe failed:", err)
      }
    },
    [channels, connectionId, databaseIdx, subscribeMutation]
  )

  const unsubscribeChannel = useCallback(
    async (channel: string) => {
      try {
        await unsubscribeMutation.mutateAsync({
          connection_id: connectionId,
          database_index: databaseIdx,
          channels: [channel],
        })
        setChannels(prev => prev.filter(c => c !== channel))
        setPublishChannel(prev => (prev === channel ? "" : prev))
      } catch (err) {
        console.error("Unsubscribe failed:", err)
      }
    },
    [connectionId, databaseIdx, unsubscribeMutation]
  )

  useEffect(() => {
    if (isSubscribeAll) {
      subscribeChannel("*")
    } else {
      unsubscribeChannel("*")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribeAll])

  const handlePublish = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!publishChannel || !publishMessage) return
    try {
      await publishMutation.mutateAsync({
        connection_id: connectionId,
        database_index: databaseIdx,
        channel: publishChannel,
        message: publishMessage,
      })
      setPublishMessage("")
    } catch (err) {
      console.error("Publish failed:", err)
    }
  }

  const onMessage = useCallback((payload: any) => {
    setMessages(prev => {
      const newMsg: PubsubMessage = {
        channel: payload.channel,
        message: payload.message,
        pattern: payload.pattern,
        time: Date.now(),
      }
      const updated = [...prev, newMsg]
      if (updated.length > MAX_MESSAGES) return updated.slice(updated.length - MAX_MESSAGES)
      return updated
    })
  }, [])

  usePubSubStream(connectionId, databaseIdx, onMessage)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autoScroll])

  const formatTime = (time: number) => {
    const d = new Date(time)
    return d.toLocaleTimeString() + "." + d.getMilliseconds().toString().padStart(3, "0")
  }

  const renderMessageContent = (content: string) => {
    try {
      const obj = JSON.parse(content)
      return <pre className="font-mono text-green-600 dark:text-green-500 mt-1 whitespace-pre-wrap">{JSON.stringify(obj, null, 2)}</pre>
    } catch (e) {
      return <div className="text-green-600 dark:text-green-500 mt-1 whitespace-pre-wrap">{content}</div>
    }
  }

  return (
    <Card className="w-full h-full border bg-background flex flex-col md:flex-row rounded-none border-none shadow-none p-0">
      <CardContent className="p-0 flex flex-col md:flex-row w-full h-full">
        <div className="w-full md:w-64 flex flex-col border-b md:border-b-0 md:border-r bg-muted/5 h-auto md:h-full shrink-0">
          <div className="h-11 px-3 border-b flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span className="flex items-center gap-1.5">
              <Radio className="h-3 w-3" /> {t("pubsub_subscriptions")}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] normal-case bg-primary/10 text-primary px-1.5 rounded-full">{channels.length}</span>
            </div>
          </div>

          <div className="px-3 py-2 border-b flex items-center justify-between text-sm bg-muted/10">
            <span className="font-medium text-foreground">{t("pubsub_subscribe_all")}</span>
            <Switch checked={isSubscribeAll} onCheckedChange={setIsSubscribeAll} />
          </div>

          <div className={`p-2 border-b transition-opacity ${isSubscribeAll ? "opacity-50 pointer-events-none" : ""}`}>
            <form
              className="flex items-center gap-2"
              onSubmit={e => {
                e.preventDefault()
                subscribeChannel(newChannelItem)
              }}
            >
              <Input placeholder={t("pubsub_channel_name")} className="h-8 text-xs" value={newChannelItem} onChange={e => setNewChannelItem(e.target.value)} />
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <ScrollArea className={`flex-1 p-2 md:h-auto h-32 transition-opacity ${isSubscribeAll ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex flex-col gap-1 text-sm">
              {channels.length === 0 ? (
                <div className="text-xs text-muted-foreground p-4 text-center border border-dashed rounded-md mt-2">{t("pubsub_no_subscriptions")}</div>
              ) : (
                channels.map(channel => (
                  <div
                    key={channel}
                    onClick={() => setPublishChannel(channel)}
                    className={`group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors border cursor-pointer ${publishChannel === channel ? "border-primary/50 bg-primary/5" : "border-transparent hover:border-border/50"}`}
                  >
                    <span className="truncate flex-1 font-mono text-xs">{channel}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={e => {
                        e.stopPropagation()
                        unsubscribeChannel(channel)
                      }}
                      title={t("pubsub_unsubscribe")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full bg-background relative">
          <div className="flex items-center justify-between px-4 h-11 border-b bg-muted/10 shrink-0">
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
              <span className="font-semibold text-foreground">{t("pubsub_message_feed")}</span>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <span>
                {messages.length} / {MAX_MESSAGES}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={autoScroll ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setAutoScroll(!autoScroll)}
                title={autoScroll ? t("pubsub_pause_scroll_desc") : t("pubsub_resume_scroll_desc")}
              >
                {autoScroll ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                {autoScroll ? t("pubsub_pause_scroll") : t("pubsub_auto_scroll")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setMessages([])}
                title={t("pubsub_clear_all_desc")}
              >
                <Ban className="h-3 w-3 mr-1" />
                {t("pubsub_clear")}
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm leading-tight bg-muted/5 text-foreground relative">
            {messages.length === 0 ? (
              <div className="text-muted-foreground h-full flex flex-col items-center justify-center italic text-xs gap-3">
                <Radio className="h-8 w-8 text-muted-foreground/30" />
                <span>{t("pubsub_waiting_events")}</span>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 hover:bg-muted/50 py-1.5 px-2 rounded-md break-all border border-transparent hover:border-border/50 transition-colors"
                >
                  <span className="text-purple-600 dark:text-purple-400 shrink-0 text-xs mt-0.5" title="Timestamp">
                    {formatTime(msg.time)}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                      [{msg.pattern ? `${msg.pattern} > ${msg.channel}` : msg.channel}]
                    </span>
                    {renderMessageContent(msg.message)}
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator />

          <div className="bg-background border-t shrink-0">
            <form className="flex flex-col" onSubmit={handlePublish}>
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Radio className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("pubsub_channel")}</span>
                </div>
                <Input
                  placeholder={t("pubsub_name_to_publish")}
                  className="h-7 flex-1 text-xs border-none bg-transparent shadow-none focus-visible:ring-0 px-0 font-mono text-primary font-bold"
                  value={publishChannel}
                  onChange={e => setPublishChannel(e.target.value)}
                />
                <Separator orientation="vertical" className="h-4 mx-1" />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!publishChannel || !publishMessage}
                  className="h-7 text-[11px] px-3 gap-1.5 transition-all shadow-none"
                >
                  <Send className="h-3 w-3" />
                  <span>{t("pubsub_publish")}</span>
                </Button>
              </div>

              <div className="w-full">
                <Textarea
                  placeholder={t("pubsub_event_content_placeholder") + "\n" + t("pubsub_ctrl_enter_to_publish")}
                  className="w-full min-h-[100px] max-h-[400px] border-0 bg-transparent shadow-none focus-visible:ring-0 resize-none font-mono text-sm p-4 leading-relaxed"
                  value={publishMessage}
                  onChange={e => setPublishMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      handlePublish(e)
                    }
                  }}
                />
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
