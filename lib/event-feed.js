(function(global){
  'use strict';

  class EventFeed {
    constructor(options){
      options = options || {};
      this.maxSize = typeof options.maxSize === 'number' ? options.maxSize : 24;
      this.events = [];
      this._counter = 0;
      this._onChange = null;
    }

    _normalize(raw, defaultWeek){
      const wk = typeof defaultWeek === 'number' ? defaultWeek : 0;
      if(typeof raw === 'string'){
        return {
          name: null,
          description: raw,
          week: wk,
          options: null,
          eventId: null
        };
      }

      if(!raw || typeof raw !== 'object'){
        return {
          name: null,
          description: String(raw || ''),
          week: wk,
          options: null,
          eventId: null
        };
      }

      return {
        name: raw.name || null,
        description: raw.description || raw.text || '',
        week: typeof raw.week === 'number' ? raw.week : wk,
        options: Array.isArray(raw.options) ? raw.options.slice() : (raw.options || null),
        eventId: raw.eventId || null
      };
    }

    _key(ev){
      return `${ev.week ?? ''}::${ev.name || ''}::${ev.description || ''}::${ev.eventId || ''}`;
    }

    _emit(){
      if(typeof this._onChange === 'function'){
        try{
          this._onChange(this.events);
        }catch(err){
          console.error('EventFeed onChange error', err);
        }
      }
    }

    setOnChange(cb){
      this._onChange = (typeof cb === 'function') ? cb : null;
    }

    hasListener(){
      return typeof this._onChange === 'function';
    }

    add(raw, defaultWeek){
      const ev = this._normalize(raw, defaultWeek);
      const key = this._key(ev);
      const existing = this.events.find(e => this._key(e) === key);
      if(existing){
        // 更新现有事件的动态字段（例如选项发生变化时）
        existing.description = ev.description;
        existing.week = ev.week;
        existing.options = ev.options;
        existing.eventId = ev.eventId;
        if(ev.name) existing.name = ev.name;
        return existing;
      }

      ev._uid = ++this._counter;
      this.events.unshift(ev);
      if(this.events.length > this.maxSize){
        this.events.pop();
      }
      this._emit();
      return ev;
    }

    markHandled(uid){
      const ev = this.getByUid(uid);
      if(!ev) return null;
      if(!ev._isHandled){
        ev._isHandled = true;
        this._emit();
      }
      return ev;
    }

    getByUid(uid){
      return this.events.find(e => e && e._uid === uid) || null;
    }

    getVisibleEvents(currentWeek, maxAge){
      const now = typeof currentWeek === 'number' ? currentWeek : null;
      const ageLimit = typeof maxAge === 'number' ? maxAge : 2;
      return this.events.filter(ev => {
        if(!ev) return false;
        if(ev._isHandled) return false;
        if(ev.options && ev.options.length > 0) return true;
        if(now !== null && typeof ev.week === 'number'){
          return (now - ev.week) <= ageLimit;
        }
        return true;
      });
    }

    hasPendingRequired(){
      return this.events.some(ev => ev && ev.options && ev.options.length > 0 && !ev._isHandled);
    }

    clear(){
      if(this.events.length === 0) return;
      this.events.splice(0, this.events.length);
      this._emit();
    }

    getAll(){
      return this.events.slice();
    }
  }

  if(!global.EventFeed){
    global.EventFeed = EventFeed;
  }
  if(!global.eventFeed || !(global.eventFeed instanceof EventFeed)){
    global.eventFeed = new EventFeed();
  }
})(typeof window !== 'undefined' ? window : globalThis);
