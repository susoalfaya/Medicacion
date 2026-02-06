import { Treatment } from '../types';

interface ScheduledNotification {
  treatmentId: string;
  timeoutId: number;
  scheduledTime: number;
}

interface NotificationConfig {
  advanceMinutes: number; // Minutos de antelación
  enabled: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private serviceWorkerReady: Promise<ServiceWorkerRegistration> | null = null;
  private config: NotificationConfig = {
    advanceMinutes: 5, // Por defecto 15 minutos antes
    enabled: true
  };

  private constructor() {
    this.initServiceWorker();
    this.loadConfig();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerReady = navigator.serviceWorker.ready;
        
        // Escuchar mensajes del Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'MEDICATION_TAKEN') {
            // Emitir evento personalizado para que la app lo maneje
            window.dispatchEvent(new CustomEvent('medicationTaken', {
              detail: { treatmentId: event.data.treatmentId }
            }));
          }
        });
        
        console.log('✅ Service Worker listo para notificaciones');
      } catch (error) {
        console.error('❌ Error inicializando Service Worker:', error);
      }
    }
  }

  // Cargar configuración desde localStorage
  private loadConfig() {
    const saved = localStorage.getItem('notificationConfig');
    if (saved) {
      this.config = JSON.parse(saved);
    }
  }

  // Guardar configuración
  private saveConfig() {
    localStorage.setItem('notificationConfig', JSON.stringify(this.config));
  }

  // Configurar minutos de antelación
  public setAdvanceMinutes(minutes: number): void {
    this.config.advanceMinutes = minutes;
    this.saveConfig();
    console.log(`⏰ Antelación configurada a ${minutes} minutos`);
  }

  // Obtener minutos de antelación actual
  public getAdvanceMinutes(): number {
    return this.config.advanceMinutes;
  }

  // Habilitar/deshabilitar notificaciones
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  // Solicitar permiso para notificaciones
  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Programar notificación para un tratamiento CON ANTELACIÓN
  public async scheduleTreatment(treatment: Treatment): Promise<void> {
    if (!this.config.enabled || !treatment.active) {
      console.log(`⏸️ Notificaciones deshabilitadas o tratamiento inactivo: ${treatment.name}`);
      return;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn('⚠️ No hay permisos para notificaciones');
      return;
    }

    // Cancelar notificación anterior si existe
    this.cancelTreatment(treatment.id);

    // Verificar si el tratamiento ya finalizó
    if (treatment.endDate && Date.now() > treatment.endDate) {
      console.log(`⏰ Tratamiento ${treatment.name} ya finalizó`);
      return;
    }

    // 🔔 CALCULAR HORA DE NOTIFICACIÓN CON ANTELACIÓN
    const scheduledTime = treatment.nextScheduledTime;
    const advanceMs = this.config.advanceMinutes * 60 * 1000;
    const notificationTime = scheduledTime - advanceMs;
    const delay = notificationTime - Date.now();

    if (delay > 0) {
      const notifDate = new Date(notificationTime);
      const doseDate = new Date(scheduledTime);
      
      console.log(`📅 ${treatment.name}:`);
      console.log(`   Notificación: ${notifDate.toLocaleString()}`);
      console.log(`   Dosis real: ${doseDate.toLocaleString()}`);
      console.log(`   Antelación: ${this.config.advanceMinutes} min`);
      
      const timeoutId = window.setTimeout(() => {
        this.showNotification(treatment, scheduledTime);
        
        // Reprogramar siguiente dosis si no ha finalizado
        const nextScheduledTime = scheduledTime + (treatment.frequencyHours * 60 * 60 * 1000);
        
        if (!treatment.endDate || nextScheduledTime <= treatment.endDate) {
          const nextTreatment: Treatment = {
            ...treatment,
            nextScheduledTime
          };
          this.scheduleTreatment(nextTreatment);
        } else {
          console.log(`✅ Tratamiento ${treatment.name} completado`);
        }
      }, delay);

      this.scheduledNotifications.set(treatment.id, {
        treatmentId: treatment.id,
        timeoutId,
        scheduledTime: notificationTime
      });

      this.saveScheduledNotifications();
    } else {
      console.log(`⏭️ Hora ya pasada para ${treatment.name}, calculando próxima dosis`);
      const now = Date.now();
      let nextScheduledTime = treatment.nextScheduledTime;
      
      while (nextScheduledTime <= now) {
        nextScheduledTime += treatment.frequencyHours * 60 * 60 * 1000;
      }

      const updatedTreatment: Treatment = {
        ...treatment,
        nextScheduledTime
      };
      
      this.scheduleTreatment(updatedTreatment);
    }
  }

  // Mostrar la notificación con información de la hora real de la dosis
  private async showNotification(treatment: Treatment, actualDoseTime: number): Promise<void> {
    const doseDate = new Date(actualDoseTime);
    const timeString = doseDate.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const title = treatment.type === 'medication' 
      ? '💊 Recordatorio de Medicación' 
      : '💧 Recordatorio de Cura';
    
    const body = `⏰ ${timeString} - ${treatment.name}${treatment.description ? '\n' + treatment.description : ''}`;

    try {
      if (this.serviceWorkerReady) {
        const registration = await this.serviceWorkerReady;
        
        if (registration.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            body,
            treatmentId: treatment.id,
            medicationType: treatment.type,
            scheduledTime: actualDoseTime
          });
        }
      } else {
        // Fallback: notificación directa
        const notification = new Notification(title, {
          body,
          icon: './icon-192x192.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: `medication-${treatment.id}`,
          requireInteraction: true,
          data: { 
            treatmentId: treatment.id,
            scheduledTime: actualDoseTime 
          }
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
      
      console.log(`🔔 Notificación mostrada: ${treatment.name} (${this.config.advanceMinutes} min antes)`);
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }

  // Cancelar notificación de un tratamiento
  public cancelTreatment(treatmentId: string): void {
    const scheduled = this.scheduledNotifications.get(treatmentId);
    if (scheduled) {
      clearTimeout(scheduled.timeoutId);
      this.scheduledNotifications.delete(treatmentId);
      this.saveScheduledNotifications();
      console.log(`❌ Cancelada notificación para tratamiento ${treatmentId}`);
    }
  }

  // Cancelar todas las notificaciones
  public cancelAll(): void {
    this.scheduledNotifications.forEach((scheduled) => {
      clearTimeout(scheduled.timeoutId);
    });
    this.scheduledNotifications.clear();
    localStorage.removeItem('scheduledMedications');
    console.log('🗑️ Todas las notificaciones canceladas');
  }

  // Guardar notificaciones programadas
  private saveScheduledNotifications(): void {
    const data = Array.from(this.scheduledNotifications.entries()).map(([id, scheduled]) => ({
      treatmentId: id,
      scheduledTime: scheduled.scheduledTime
    }));
    localStorage.setItem('scheduledMedications', JSON.stringify(data));
  }

  // Restaurar notificaciones al cargar la app
  public restoreScheduledNotifications(treatments: Treatment[]): void {
    console.log(`🔄 Restaurando notificaciones para ${treatments.length} tratamientos`);
    console.log(`⏰ Antelación configurada: ${this.config.advanceMinutes} minutos`);
    
    // Cancelar todas las notificaciones anteriores
    this.cancelAll();

    // Programar notificaciones para todos los tratamientos activos
    treatments.forEach(treatment => {
      if (treatment.active) {
        this.scheduleTreatment(treatment);
      }
    });
  }

  // Reprogramar todas las notificaciones (útil al cambiar la antelación)
  public reprogramAll(treatments: Treatment[]): void {
    console.log('🔄 Reprogramando todas las notificaciones...');
    this.restoreScheduledNotifications(treatments);
  }

  // Verificar si hay permisos
  public hasPermission(): boolean {
    return Notification.permission === 'granted';
  }

  // Obtener estado de los permisos
  public getPermissionStatus(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // Obtener configuración actual
  public getConfig(): NotificationConfig {
    return { ...this.config };
  }
}

export const notificationService = NotificationService.getInstance();