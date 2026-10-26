<?php
/**
 * Booking Calendar Template Part
 * Simplified booking form – WhatsApp/phone based.
 * Use [booking_calendar] shortcode to include.
 *
 * @package Canine_Clinic
 */

$is_rtl = is_rtl();
$wa_url = cc_get_whatsapp_url();
$phone  = cc_get_phone();
?>

<div class="booking-calendar" id="bookingCalendar">
    <h2 class="text-center"><?php echo $is_rtl ? 'احجز موعدك' : 'Book Your Appointment'; ?></h2>
    <p class="text-center section-desc"><?php echo $is_rtl
        ? 'اختر الطريقة المفضلة لحجز موعدك'
        : 'Choose your preferred method to book an appointment'; ?></p>

    <!-- Progress Steps (visual only) -->
    <div class="booking-progress">
        <div class="progress-step active" data-step="1">
            <div class="step-circle">1</div>
            <span><?php echo $is_rtl ? 'الفرع' : 'Branch'; ?></span>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="2">
            <div class="step-circle">2</div>
            <span><?php echo $is_rtl ? 'الخدمة' : 'Service'; ?></span>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="3">
            <div class="step-circle">3</div>
            <span><?php echo $is_rtl ? 'المعلومات' : 'Details'; ?></span>
        </div>
        <div class="progress-line"></div>
        <div class="progress-step" data-step="4">
            <div class="step-circle">4</div>
            <span><?php echo $is_rtl ? 'التأكيد' : 'Confirm'; ?></span>
        </div>
    </div>

    <!-- Step 1: Branch -->
    <div class="booking-step active" id="bookingStep1">
        <h3><?php echo $is_rtl ? 'اختر الفرع' : 'Select Branch'; ?></h3>
        <div class="booking-options">
            <label class="booking-option">
                <input type="radio" name="branch" value="nasr-city" checked>
                <div class="option-card">
                    <strong><?php echo $is_rtl ? 'الفرع الرئيسي - مدينة نصر' : 'Main Branch - Nasr City'; ?></strong>
                    <span><?php echo $is_rtl ? 'القاهرة' : 'Cairo'; ?></span>
                </div>
            </label>
            <label class="booking-option">
                <input type="radio" name="branch" value="el-shorouk">
                <div class="option-card">
                    <strong><?php echo $is_rtl ? 'فرع الشروق' : 'El Shorouk Branch'; ?></strong>
                    <span><?php echo $is_rtl ? 'ذا إيدج مول' : 'The Edge Mall'; ?></span>
                </div>
            </label>
        </div>
        <button class="btn-primary booking-next" data-next="2"><?php echo $is_rtl ? 'التالي' : 'Next'; ?></button>
    </div>

    <!-- Step 2: Service -->
    <div class="booking-step" id="bookingStep2">
        <h3><?php echo $is_rtl ? 'اختر الخدمة' : 'Select Service'; ?></h3>
        <div class="booking-options">
            <?php
            $booking_services = [
                'general'      => $is_rtl ? 'طب الأسنان العام' : 'General Dentistry',
                'cosmetic'     => $is_rtl ? 'طب الأسنان التجميلي' : 'Cosmetic Dentistry',
                'implants'     => $is_rtl ? 'زراعة الأسنان' : 'Dental Implants',
                'orthodontics' => $is_rtl ? 'تقويم الأسنان' : 'Orthodontics',
                'whitening'    => $is_rtl ? 'تبييض الأسنان' : 'Teeth Whitening',
                'root-canal'   => $is_rtl ? 'علاج الجذور' : 'Root Canal',
            ];
            foreach ( $booking_services as $val => $label ) : ?>
                <label class="booking-option">
                    <input type="radio" name="service" value="<?php echo esc_attr( $val ); ?>">
                    <div class="option-card">
                        <strong><?php echo esc_html( $label ); ?></strong>
                    </div>
                </label>
            <?php endforeach; ?>
        </div>
        <div class="booking-nav">
            <button class="btn-secondary booking-prev" data-prev="1"><?php echo $is_rtl ? 'السابق' : 'Previous'; ?></button>
            <button class="btn-primary booking-next" data-next="3"><?php echo $is_rtl ? 'التالي' : 'Next'; ?></button>
        </div>
    </div>

    <!-- Step 3: Details -->
    <div class="booking-step" id="bookingStep3">
        <h3><?php echo $is_rtl ? 'معلوماتك' : 'Your Details'; ?></h3>
        <div class="booking-form-fields">
            <div class="form-group">
                <label><?php echo $is_rtl ? 'الاسم' : 'Name'; ?></label>
                <input type="text" id="bookingName" required>
            </div>
            <div class="form-group">
                <label><?php echo $is_rtl ? 'رقم الهاتف' : 'Phone'; ?></label>
                <input type="tel" id="bookingPhone" required>
            </div>
            <div class="form-group">
                <label><?php echo $is_rtl ? 'التاريخ المفضل' : 'Preferred Date'; ?></label>
                <input type="date" id="bookingDate" min="<?php echo date('Y-m-d'); ?>">
            </div>
            <div class="form-group">
                <label><?php echo $is_rtl ? 'ملاحظات' : 'Notes'; ?></label>
                <textarea id="bookingNotes" rows="3"></textarea>
            </div>
        </div>
        <div class="booking-nav">
            <button class="btn-secondary booking-prev" data-prev="2"><?php echo $is_rtl ? 'السابق' : 'Previous'; ?></button>
            <button class="btn-primary booking-next" data-next="4"><?php echo $is_rtl ? 'التالي' : 'Next'; ?></button>
        </div>
    </div>

    <!-- Step 4: Confirm -->
    <div class="booking-step" id="bookingStep4">
        <h3><?php echo $is_rtl ? 'تأكيد الحجز' : 'Confirm Booking'; ?></h3>
        <div class="booking-summary" id="bookingSummary">
            <!-- Filled by JS -->
        </div>
        <div class="booking-actions">
            <a href="<?php echo esc_url( $wa_url ); ?>" target="_blank" rel="noopener" class="btn-primary whatsapp-btn" id="bookingWhatsapp">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.694-1.228A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.594-.838-6.324-2.236l-.14-.112-3.131.82.836-3.04-.123-.147A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                <?php echo $is_rtl ? 'أكد عبر الواتساب' : 'Confirm via WhatsApp'; ?>
            </a>
            <a href="tel:<?php echo esc_attr( $phone ); ?>" class="btn-secondary">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                <?php echo $is_rtl ? 'اتصل بنا' : 'Call Us'; ?>
            </a>
        </div>
        <div class="booking-nav" style="margin-top:1rem;">
            <button class="btn-secondary booking-prev" data-prev="3"><?php echo $is_rtl ? 'السابق' : 'Previous'; ?></button>
        </div>
    </div>
</div>

<script>
(function() {
    var calendar = document.getElementById('bookingCalendar');
    if (!calendar) return;

    var steps = calendar.querySelectorAll('.booking-step');
    var progressSteps = calendar.querySelectorAll('.progress-step');
    var waBtn = document.getElementById('bookingWhatsapp');
    var summary = document.getElementById('bookingSummary');
    var isRTL = <?php echo $is_rtl ? 'true' : 'false'; ?>;

    function goToStep(n) {
        steps.forEach(function(s) { s.classList.remove('active'); });
        progressSteps.forEach(function(p, i) {
            p.classList.toggle('active', i < n);
            p.classList.toggle('completed', i < n - 1);
        });
        var target = document.getElementById('bookingStep' + n);
        if (target) target.classList.add('active');

        if (n === 4) buildSummary();
    }

    function getVal(name) {
        var el = calendar.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : '';
    }

    function buildSummary() {
        var branch  = getVal('branch');
        var service = getVal('service');
        var name    = (document.getElementById('bookingName') || {}).value || '';
        var phone   = (document.getElementById('bookingPhone') || {}).value || '';
        var date    = (document.getElementById('bookingDate') || {}).value || '';
        var notes   = (document.getElementById('bookingNotes') || {}).value || '';

        var branchLabel = branch === 'el-shorouk'
            ? (isRTL ? 'فرع الشروق' : 'El Shorouk')
            : (isRTL ? 'مدينة نصر' : 'Nasr City');

        if (summary) {
            summary.innerHTML =
                '<p><strong>' + (isRTL ? 'الفرع' : 'Branch') + ':</strong> ' + branchLabel + '</p>' +
                '<p><strong>' + (isRTL ? 'الخدمة' : 'Service') + ':</strong> ' + service + '</p>' +
                '<p><strong>' + (isRTL ? 'الاسم' : 'Name') + ':</strong> ' + name + '</p>' +
                '<p><strong>' + (isRTL ? 'الهاتف' : 'Phone') + ':</strong> ' + phone + '</p>' +
                (date ? '<p><strong>' + (isRTL ? 'التاريخ' : 'Date') + ':</strong> ' + date + '</p>' : '') +
                (notes ? '<p><strong>' + (isRTL ? 'ملاحظات' : 'Notes') + ':</strong> ' + notes + '</p>' : '');
        }

        // Build WhatsApp message
        var msg = (isRTL ? 'مرحبًا، أود حجز موعد:\n' : 'Hello, I would like to book an appointment:\n') +
            (isRTL ? 'الفرع: ' : 'Branch: ') + branchLabel + '\n' +
            (isRTL ? 'الخدمة: ' : 'Service: ') + service + '\n' +
            (isRTL ? 'الاسم: ' : 'Name: ') + name + '\n' +
            (isRTL ? 'الهاتف: ' : 'Phone: ') + phone +
            (date ? '\n' + (isRTL ? 'التاريخ: ' : 'Date: ') + date : '') +
            (notes ? '\n' + (isRTL ? 'ملاحظات: ' : 'Notes: ') + notes : '');

        if (waBtn) {
            waBtn.href = 'https://wa.me/201144848521?text=' + encodeURIComponent(msg);
        }
    }

    // Next/Prev navigation
    calendar.querySelectorAll('.booking-next').forEach(function(btn) {
        btn.addEventListener('click', function() {
            goToStep(parseInt(btn.getAttribute('data-next')));
        });
    });
    calendar.querySelectorAll('.booking-prev').forEach(function(btn) {
        btn.addEventListener('click', function() {
            goToStep(parseInt(btn.getAttribute('data-prev')));
        });
    });
})();
</script>
