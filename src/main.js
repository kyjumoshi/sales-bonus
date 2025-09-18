/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   const {discount = 0, sale_price = 0, quantity = 0} = purchase;
   const discountFactor = 1 - (discount / 100);

   return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;
    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05; 
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(inputData, config) {
    // @TODO: Проверка входных данных
    if (!inputData
        || (!Array.isArray(inputData.sellers) || !Array.isArray(inputData.products) || !Array.isArray(inputData.purchase_records))
        || ((inputData.sellers.length === 0) || (inputData.purchase_records.length === 0) || (inputData.products.length === 0))
    ) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    if (config == null 
        || typeof config !== "object"
    ) {
        throw new Error('Опции должны быть объектом');
    }

    const {calculateRevenue, calculateBonus} = config;

    if (calculateRevenue === undefined 
        || calculateBonus === undefined
    ) {
        throw new Error('Переменные в опциях не определены');
    }

    if (typeof calculateRevenue !== "function"
        || typeof calculateBonus !== "function"
    ) {
        throw new Error('Переменные в опциях должны быть функциями');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const statistics = inputData.sellers.map(sellerRecord => ({
        seller_id: sellerRecord.id,
        full_name: `${sellerRecord.first_name} ${sellerRecord.last_name}`,
        total_revenue: 0,
        total_profit: 0,
        total_sales: 0,
        sold_items: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerMap = statistics.reduce((mapping, stat) => {
        mapping[stat.seller_id] = stat;
        return mapping;
    }, {});

    const productMap = inputData.products.reduce((mapping, product) => {
        mapping[product.sku] = product;
        return mapping;
    }, {});

    // @TODO: Расчет выручки и прибыли для каждого продавца
    inputData.purchase_records.forEach(sale => {
        const sellerStat = sellerMap[sale.seller_id];
        if (!sellerStat) return;
        
        sellerStat.total_sales += 1;
        const revenueValue = Number(sale.total_amount || 0);
        sellerStat.total_revenue += revenueValue;

        sale.items.forEach(item => {
            const productInfo = productMap[item.sku]; 
            if (!productInfo) return; 

            const itemQuantity = Number(item.quantity || 0);
            const itemCost = Number(productInfo.purchase_price) * itemQuantity;

            const itemRevenue = Number(calculateRevenue(item, productInfo)) || 0;

            const itemProfit = itemRevenue - itemCost;

            sellerStat.total_profit += itemProfit;

            if (!sellerStat.sold_items[item.sku]) {
                sellerStat.sold_items[item.sku] = 0;
            }
            sellerStat.sold_items[item.sku] += itemQuantity;
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    statistics.sort((first, second) => (second.total_profit || 0) - (first.total_profit || 0));

    // @TODO: Назначение премий на основе ранжирования
    statistics.forEach((sellerStat, position) => {
        sellerStat.bonus_amount = calculateBonus(position, statistics.length, {
            profit: sellerStat.total_profit
        });
        
        sellerStat.best_selling = Object
            .entries(sellerStat.sold_items)
            .map(([productSku, qty]) => ({sku: productSku, quantity: qty}))
            .sort(((a, b) => b.quantity - a.quantity))
            .slice(0, 10);
    });

    const formatNumber = value => +Number(value || 0).toFixed(2);
    
    // @TODO: Подготовка итоговой коллекции с нужными полями
    return statistics.map(stat => ({
        seller_id: String(stat.seller_id),
        name: stat.full_name,
        revenue: formatNumber(stat.total_revenue),
        profit: formatNumber(stat.total_profit),
        sales_count: stat.total_sales,
        top_products: stat.best_selling,
        bonus: formatNumber(stat.bonus_amount),
    })); 
}